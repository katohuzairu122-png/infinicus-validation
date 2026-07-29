# BUILD-18 — Authentication and Authorization: Security Controls

## Password handling

- Hashed with bcrypt, cost factor 12 (`packages/authentication/src/password.ts`).
- Never logged, never included in any repository row returned to callers
  alongside other user fields — `UserRepository.getPasswordHash()` is a
  separate, explicit method, documented as "never exposed alongside the
  rest of the User record."
- Strength-validated *before* hashing: minimum 12 characters, at least 3
  of {lowercase, uppercase, digit, symbol}. A weak password is rejected
  (`WeakPasswordError`) before any database write, including during
  `changePassword`.

## Session and API-key tokens

- Generated with `node:crypto.randomBytes` (32 bytes / 256 bits of
  entropy each).
- Hashed with SHA-256 before storage — deliberately not bcrypt: the
  tokens already carry full entropy, so bcrypt's intentional slowness
  (designed to slow down brute-forcing of low-entropy human passwords)
  would only add unnecessary latency to high-frequency per-request
  lookups, documented as a code comment in `tokens.ts`.
- The raw token/key is returned to the caller exactly once (at
  login/generation time) and never persisted — only its hash is stored.

## Fail-closed authentication

`AuthenticationService.validateSession` never returns a falsy/null
result for an invalid session — it always throws a specific, typed
error (`SessionInvalidError`, `SessionRevokedError`,
`SessionExpiredError`, `AccountNotActiveError`), so a caller cannot
accidentally treat "unknown" as "authenticated" through a missed null
check.

## Fail-closed authorization

`AuthorizationService.authorize` follows the same pattern: any of
"no membership," "membership not active," or "no matching role
permission" throws (`PermissionDeniedError` or
`MembershipNotActiveError`) rather than returning `false`. Every denial
path also records a `permission_denied` access event before throwing,
so authorization failures are independently auditable even if the
calling code swallows the exception.

## Tenant isolation (RLS)

All tenant-scoped auth tables (`identity.service_accounts`,
`identity.api_key_references`, `tenancy.roles`, `tenancy.memberships`,
`tenancy.invitations`) rely on the same RLS architecture as every prior
persistence-stage build: `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL
SECURITY`, with a null-safe fail-closed predicate on
`current_setting('app.tenant_id', true)::uuid`. This build did not
create or alter any RLS policy — it consumes the frozen policies from
migrations `0004`/`0011`.

Two tables (`identity.users`, `identity.sessions`) are intentionally
global with no RLS at all, matching their frozen schema (no `tenant_id`
column exists on either) — a user's identity is not itself tenant-scoped
in this schema; only membership is.

`audit.access_events` has a `tenant_id IS NULL OR tenant_id =
current_setting('app.tenant_id', true)::uuid` policy that applies to
both reads and writes (Postgres uses `USING` as the implicit `WITH
CHECK` when a policy doesn't declare one explicitly). `AccessEventRepository`
sets `app.tenant_id` in-session (via `SELECT set_config(...)`) before any
insert/select where a non-null tenant is supplied, and leaves it unset
for tenant-less events (e.g. a `failed_auth` event for an unknown email,
which by definition predates tenant resolution) — this was a defect
found and fixed during this build's live-integration testing (see
Known Limitations / test-evidence for the specific failure and fix).

## Cross-tenant isolation — live-tested

`tests/auth-repositories.integration.test.ts` includes a dedicated
"cross-tenant isolation (live RLS)" describe block asserting, against
the real database:

- tenant 2 cannot read a tenant-1 service account (`ServiceAccountNotFoundError`)
- tenant 2 cannot read a tenant-1 membership (`MembershipNotFoundError`)
- tenant 2 cannot read a tenant-1 invitation (`InvitationNotFoundError`)
- tenant 2 cannot verify a tenant-1 API key, even with the correct prefix and hash (`ApiKeyNotFoundError`)
- tenant 2 sees zero rows when querying tenant-1 access events by tenant scope

## The API-key / invitation "chicken-and-egg" problem

Both `identity.api_key_references` and `tenancy.invitations` are
RLS-scoped to their tenant, which means a lookup by opaque key/token
alone is impossible without already knowing the tenant. This is a
genuine constraint of the frozen schema (not something this build could
change), resolved two different ways depending on the actual data shape
available:

- **API keys**: `keyPrefix` is stored in the clear specifically to
  support fast lookup, but the tenant itself still must be resolved
  upstream of `ApiKeyRepository.verify()` — e.g. via subdomain or
  workspace-slug routing at the HTTP layer. Documented directly in
  `ApiKeyRepository`'s class-level comment. This is explicitly
  out-of-scope for this build since no HTTP layer exists yet.
- **Invitations**: the raw invitation token itself is structured as
  `${tenantId}:${workspaceId}:${secret}` (not opaque), so the accepting
  client can parse tenant/workspace before any database lookup —
  implemented in `invitationTokens.ts`.

## No secrets in logs, events, or errors

- `AccessEventRepository` stores structured `metadata` (e.g.
  `{ reason: 'bad_password' }`) — never the password or token itself.
- Error messages (`InvalidCredentialsError`, `SessionInvalidError`, etc.)
  are deliberately generic and never echo back the credential that was
  checked.

## Least privilege

- `PermissionRepository`, `UserRepository`, `SessionRepository` use the
  plain `withTransaction` (no elevated/admin connection) — the same
  `app_test_user`-equivalent least-privilege role used by every other
  domain in this codebase.
- No repository in this build uses a `BYPASSRLS` connection at runtime;
  the admin connection is test/migration-tooling only.
