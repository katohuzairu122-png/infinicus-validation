# BUILD-21 — Governed Application API: Architecture and Scope

**Build:** BUILD-21 (API) · **Depends on:** BUILD-20 (completed) · **Status:** Complete

## Purpose

Expose the already-built service layers — `AuthenticationService`
(BUILD-18), `AuthorizationService` (BUILD-18), `OnboardingService`
(BUILD-19), and `DecisionWorkflowService` (BUILD-20) — through a single,
coherent, **governed** HTTP surface: versioned, schema-validated,
authenticated, authorized, idempotent, paginated, correlation-tracked,
controlled-error, rate-limited, audit-logged, and OpenAPI-documented, as
required by spec §2. This is the first build in the sequence to give any
of those service layers a real network-reachable interface.

## Explicit scope decision made before coding (per spec §1.4/§4 and root CLAUDE.md §4)

Root `CLAUDE.md` §4 gates `apps/api`'s HTTP framework behind "Fastify,
NestJS, or another framework only after the base architecture is
approved" — no prior instruction existed. **The user was asked directly**
before any server code was written (Fastify vs. NestJS vs. something
else vs. skip) and explicitly chose **Fastify**. That choice is treated
as the instruction root CLAUDE.md requires, recorded here for the
record — the same pattern already used for BUILD-20's Next.js choice.

## What already existed (reused, not duplicated)

Every domain operation this API exposes is a thin HTTP wrapper around an
already-built, already-tested service:

| Route group | Delegates to | Built in |
|---|---|---|
| `/v1/auth/*` | `AuthenticationService` (`@infinicus/authentication`) | BUILD-18 |
| `/v1/onboarding*` | `OnboardingService` (`@infinicus/onboarding`) | BUILD-19 |
| `/v1/businesses*` (list, workflow view) | `DecisionWorkflowService` (`@infinicus/workflow`) | BUILD-20 |
| `/v1/businesses/:id/decisions` | `DecisionWorkflowService.createReview` + `.submitApprovalDecision` | BUILD-20 |
| `/v1/businesses/:id/outcomes` | `DecisionWorkflowService.recordOutcome` | BUILD-20 |
| Permission gating (`aba:write`, `om:write`) | `AuthorizationService.authorize()` | BUILD-18 |

No business logic was reimplemented at the HTTP layer — every route
handler's body is a schema-validated pass-through to the service method
that already owns that operation's persistence, tenancy, and
immutability rules.

## What was genuinely new

### 1. `api.idempotency_keys` (migrations 0142–0145)

The one genuinely new piece of persistence this build required. No
existing repository's own idempotency mechanism generalizes across
arbitrary HTTP routes (each domain's own idempotency, where it exists,
is scoped to that domain's specific write operation) — a tenant-scoped,
route-scoped table was the smallest correct solution:
`UNIQUE (tenant_id, idempotency_key, route)`, storing a `request_hash`
(SHA-256 of the JSON body) to distinguish a genuine replay (same key,
same body → return the stored response) from a conflicting reuse (same
key, different body → `IdempotencyConflictError`, 409).

### 2. Real tenant-context resolution via membership verification

`apps/web`'s BUILD-20 tenant context is a documented placeholder that
trusts query parameters outright (no Bearer-token identity exists
there). This build's `resolveTenantContext` preHandler goes further,
because Bearer-token authentication actually proves caller identity
here: it requires `X-Tenant-Id`/`X-Workspace-Id` headers, then verifies
the authenticated user has an **ACTIVE** `tenancy.memberships` row for
that exact tenant/workspace (`MembershipRepository.getByUserAndWorkspace`)
before attaching `request.ctx` — genuine authorization enforcement, not
a placeholder.

### 3. Permission-gated writes

`app.requirePermission('aba:write')` / `app.requirePermission('om:write')`
wrap `AuthorizationService.authorize()` (BUILD-18) with zero new
authorization logic — the same permission catalog seeded in BUILD-18
gates the two state-changing route groups.

## Route surface (spec §2 mapped to implementation)

| Requirement | Implementation |
|---|---|
| Versioned API | All routes under `/v1/...` |
| Schema validation | Zod schemas per route (`apps/api/src/schemas/*`), enforced via `fastify-type-provider-zod` |
| Authentication | `app.authenticate` — `Authorization: Bearer <token>` → `AuthenticationService.validateSession()` |
| Authorization | `app.resolveTenantContext` (membership check) + `app.requirePermission(code)` |
| Idempotency | `app.requireIdempotencyKey` + `api.idempotency_keys` (tenant+route scoped) |
| Pagination | `paginate<T>()` at the response layer (`page`/`pageSize` query params) |
| Correlation IDs | `X-Correlation-Id` request/response header, generated if absent, on every log line |
| Controlled errors | Single envelope `{ error: { code, message, correlationId } }`; unmapped errors redacted to a generic 500 |
| Rate limits | `@fastify/rate-limit`, configured via `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS` |
| Audit logging | `onResponse` hook → `logAuditEntry()` (`@infinicus/observability`), every request |
| OpenAPI documentation | `@fastify/swagger` + `@fastify/swagger-ui` at `/documentation`, generated from the same Zod schemas |
| Integration tests | `apps/api/tests/api.integration.test.ts` — 26 live-PostgreSQL tests via `app.inject()` |

## Architecture rules preserved

- No duplicate infrastructure — every domain table and write path this
  build reaches already existed; the only new table is the HTTP-layer
  idempotency-bookkeeping table described above.
- Server-side enforcement only — authentication, tenant-context
  resolution, and permission checks all run in Fastify preHandlers,
  never trusted from the client.
- Tenant isolation is enforced by the same RLS policies every prior
  build relies on, reached through the same `withTenantTransaction`
  pattern inside each wrapped service/repository.
- Migrations 0001–0141 verified byte-identical (`git diff --exit-code`);
  only 0142–0145 are new.
- No later-build functionality — this build is the HTTP governance
  layer over already-shipped domain logic, not a new business
  capability.

## Out of scope (explicitly not built)

See `known-limitations-build21.md` for the full list; the headline items
are: pagination is applied after a full repository fetch rather than
pushed into `LIMIT`/`OFFSET` at the SQL layer, `POST /v1/onboarding` has
no idempotency requirement (tenant creation is a genuine bootstrap case
— see `security-controls-build21.md`), and the workflow-view response is
a summarized aggregate rather than the full nested shape `apps/web`
renders.
