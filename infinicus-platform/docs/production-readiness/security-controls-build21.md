# BUILD-21 — Governed Application API: Security Controls

## Fail-closed authentication

`app.authenticate` requires a well-formed `Authorization: Bearer <token>`
header and a token that `AuthenticationService.validateSession()`
accepts as live and unexpired; anything else (missing header, malformed
header, invalid/expired/revoked token) is rejected before any route
handler body runs (`SessionInvalidError`/`SessionExpiredError`/
`SessionRevokedError` → 401). No route reachable without authentication
skips this check — `preHandler: [app.authenticate]` is explicit on every
protected route.

## Fail-closed tenant-context resolution — real authorization, not a placeholder

Unlike `apps/web`'s BUILD-20 tenant context (documented as trusting
visible query parameters outright, since no Bearer-token identity exists
there), this API's Bearer-token authentication genuinely proves caller
identity — so `app.resolveTenantContext` performs real verification: it
requires `X-Tenant-Id`/`X-Workspace-Id` headers, then queries
`tenancy.memberships` for an **ACTIVE** row matching the authenticated
user, that exact tenant, and that exact workspace
(`MembershipRepository.getByUserAndWorkspace`). Missing headers → 403
(`PermissionDeniedError`). No matching membership, or a membership in
any non-`active` status → 404/403 respectively — never a silent fallback
to "no tenant" or another tenant's data. Live-tested: a freshly
registered user with zero memberships receives 404 when attempting to
access a real tenant/workspace pair they were never added to.

## Permission-gated writes

`app.requirePermission('aba:write')` and `app.requirePermission('om:write')`
delegate to `AuthorizationService.authorize()` (BUILD-18) with no new
authorization logic — a `viewer`-role caller attempting to submit an ABA
decision receives 403 (`PermissionDeniedError`), live-tested against a
real seeded `viewer` role assignment.

## Tenant isolation (RLS) — unchanged, fully inherited

Every read and write this API triggers ultimately runs through
`withTenantTransaction(ctx, ...)` in the wrapped service/repository — the
same fail-closed RLS enforcement every prior build relies on. This build
adds one new RLS-protected table (`api.idempotency_keys`,
`tenant_id = current_setting('app.tenant_id', true)::uuid`), live-tested
for cross-tenant independence (the same idempotency key under two
different tenants produces two independent records, never a collision or
cross-tenant leak).

## Controlled, redacted errors

Every error response uses one envelope:
`{ "error": { "code", "message", "correlationId" } }`. A name-based
lookup table (`apps/api/src/errors.ts`) maps recognized error names to
HTTP status codes; anything **not** in the table is logged in full
server-side but returned to the client as a generic, redacted 500
(`internal_error`, `"An unexpected error occurred."`) — never the
original message or stack trace.

**A genuine discovery made while wiring this table up**: every
domain-specific error class in `packages/database`'s per-domain
`errors.ts` files (e.g. `MembershipNotFoundError`,
`TenantSlugConflictError`) is defined as an **empty subclass** of a
shared per-domain base (`NotFoundError`/`ConflictError`/`ValidationError`/
`InvalidTransitionError`), and that base class's constructor
unconditionally sets `this.name` to its own generic name — an empty
subclass never overrides it. So at runtime, none of those
specific-looking subclass names ever actually appear as `.name`; only
the generic base name does, uniformly across every domain (`da`, `bo`,
`bi`, `dt`, `simulation`, `adi`, `aba`, `om`, `cl`, `auth`,
`onboarding`). The initial version of this table enumerated the
specific (dead) names and consequently mis-mapped a real 404 case to a
redacted 500 — caught during this build's own live-integration testing
(see `test-evidence-build21.md`) and fixed by keying the table off the
four generic base names instead, with errors that genuinely do set their
own unique name (auth/authz package errors, `OnboardingStepOrderError`,
this build's own `IdempotencyConflictError`) listed individually. This
does not change any status code any client should have observed once
correct — it only fixes a mapping bug that would otherwise have leaked a
false "internal server error" for what is actually an ordinary,
expected 404/409/400.

## Idempotency — genuine replay protection, not best-effort

`app.requireIdempotencyKey` requires an `Idempotency-Key` header on every
state-changing route it guards; the key is scoped per tenant **and**
route (`UNIQUE (tenant_id, idempotency_key, route)`), so a key reused
against a different route or under a different tenant is independent,
never a false conflict. A key reused with an identical request body
short-circuits to the original response without re-executing the
handler (verified: a second identical POST does not create a second
decision). A key reused with a **different** body is rejected as a 409
conflict (`IdempotencyConflictError`) rather than silently accepted or
silently overwritten.

## Bootstrapping exception: `POST /v1/onboarding` has no idempotency requirement

Deliberate, not an oversight: the idempotency mechanism above is
tenant-scoped, and `POST /v1/onboarding` is the one operation that
creates a brand-new tenant — no tenant exists yet at the point this
route runs, so there is nothing to scope a key to. This mirrors the
identical "tenant creation is a genuine bootstrap case" constraint
already documented for `TenantRepository`/`OnboardingProgressRepository`
in BUILD-19. Duplicate-prevention for this one route instead relies on
`TenantSlugConflictError` (409) — a second attempt to onboard the same
slug is naturally rejected without needing a client-supplied key.

## No secrets in the browser bundle / logs / errors

`apps/api` is a plain Node server — there is no browser bundle. Log
output uses Fastify's own request-scoped logger plus
`@infinicus/observability`'s audit logger; neither ever logs a raw
password, session token, or database credential (only the hashed/opaque
identifiers already established as safe-to-log in BUILD-18). Error
envelopes never include the original error message for unmapped
(potential-secret-bearing) errors — see "Controlled, redacted errors"
above.

## Rate limiting

`@fastify/rate-limit` is registered globally with configurable
`max`/`timeWindow` (`RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`); every
response carries the standard `X-RateLimit-*` headers, live-tested.

## Least privilege

`apps/api` connects with the same least-privilege, RLS-enforced
`app_test_user`-equivalent role as every other part of this codebase —
no `BYPASSRLS` connection is used anywhere in the running application
(the live integration test's separate `ADMIN_DATABASE_URL` pool is
fixture-setup-only, mirroring every prior build's test convention).

## Input validation and output encoding

Every request body, query string, and route parameter is validated
against an explicit Zod schema before the handler body runs — anything
that fails validation is rejected with a 400 (`validation_error`)
including Fastify's own validation error detail (safe to expose; it
describes shape mismatches, never secret values). Response bodies are
serialized through the same Zod-derived schemas
(`fastify-type-provider-zod`'s `serializerCompiler`), so a handler can
never accidentally leak an unlisted field.
