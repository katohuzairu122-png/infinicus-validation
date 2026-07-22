# BUILD-18 — Authentication and Authorization: Test Evidence

All tests below were executed against a live local disposable PostgreSQL
16 instance (schema `identity`/`tenancy`/`audit`, migrations `0001`–`0137`
applied). No test result in this document is asserted from code review
alone — every number below is from an actual `vitest run` execution.

## New test files (this build)

| File | Package | Kind | Result |
|---|---|---|---|
| `tests/auth-repositories.integration.test.ts` | `@infinicus/database` | Live integration | 65 passed, 1 skipped (guard) |
| `tests/password.test.ts` | `@infinicus/authentication` | Unit | 10 passed |
| `tests/tokens.test.ts` | `@infinicus/authentication` | Unit | 13 passed |
| `tests/AuthenticationService.integration.test.ts` | `@infinicus/authentication` | Live integration | 22 passed, 1 skipped (guard) |
| `tests/invitationTokens.test.ts` | `@infinicus/authorization` | Unit | 11 passed |
| `tests/AuthorizationService.integration.test.ts` | `@infinicus/authorization` | Live integration | 14 passed, 1 skipped (guard) |

**Totals:** 34 pure unit tests, 101 live-database integration tests
(101 = 65 + 22 + 14), 135 executed assertions across 6 new files.

## Coverage by requirement (spec §6)

- **Unit tests**: `password.test.ts`, `tokens.test.ts`,
  `invitationTokens.test.ts` — strength validation, hashing/verification,
  token generation/parsing round-trips, malformed-input rejection.
- **Integration tests**: all 9 auth repositories against the live schema;
  the full `AuthenticationService` lifecycle; the full
  `AuthorizationService` lifecycle including invitations.
- **Authorization and tenant-isolation tests**: dedicated "cross-tenant
  isolation (live RLS)" block (5 tests) in
  `auth-repositories.integration.test.ts`; `AuthorizationService`
  integration tests against all 4 seeded system roles
  (owner/admin/member/viewer) plus a no-membership and a
  suspended-membership case.
- **Failure-path tests**: unknown user/session/role/permission/
  membership/invitation lookups (`*NotFoundError` for each); login with
  unknown email, wrong password, pending account, suspended account;
  session validation against unknown/revoked/expired tokens and a
  suspended-account session; invitation acceptance against an
  already-accepted and a revoked invitation; malformed invitation
  tokens.
- **Idempotency tests**: migration `0137` reapplication (see below);
  `MembershipRepository.assignRole` uses `ON CONFLICT DO NOTHING`,
  tested directly.
- **Migration tests**: fresh-database install and re-run idempotency
  (see below).
- **Security tests**: password strength rejection, bcrypt hash
  distinctness from plaintext, session/API-key hash determinism and
  entropy, cross-tenant RLS denial (listed above).
- **Regression tests**: full existing `@infinicus/database` suite
  re-run unchanged (below).

## Full regression (this build's changes against every prior build)

```
packages/database: 22 test files, 2685 passed | 8 skipped (2693 total)
```

Every prior domain's suite (`da`, `bo`, `bi`, `dt`, `simulation`, `adi`,
`aba`, `om`, `cl`, plus all `migration-stage2*` structural suites)
passed unchanged — the new `auth` domain did not alter any existing
table, RLS policy, or repository.

```
packages/authentication: 3 test files, 45 passed | 1 skipped (46 total)
packages/authorization:  2 test files, 25 passed | 1 skipped (26 total)
```

## Static checks

```
pnpm typecheck   → 3/3 packages with a typecheck script pass (database, authentication, authorization)
pnpm lint        → 21/21 packages pass (0 errors; 5 pre-existing console-statement
                    warnings in packages/database/src/client.ts and migrate.ts,
                    unrelated to this build)
pnpm build       → 21/21 packages build successfully
```

## Frozen-migration byte-identity

```
git diff --exit-code -- infinicus-platform/infrastructure/database/migrations/ \
  ':!infinicus-platform/infrastructure/database/migrations/0137_seed_auth_roles_permissions.sql'
→ exit 0 (clean — migrations 0001-0136 untouched)
```

## Empty-database install test

Migrations `0001`–`0137` applied in one pass to a freshly created,
completely empty database (`infinicus_test_fresh`):

```
137 files: 137 "apply … done" lines, 0 errors
```

Post-install verification (live query against the fresh database):

```
tenancy.permissions:        29 rows
owner role permission count: 29
admin role permission count: 28
member role permission count: 18
viewer role permission count: 9
```

## Migration idempotency test

Re-running the migration runner against the already-migrated fresh
database:

```
0 "apply" lines, 137 "skip" lines
```

Confirms `0137` (and all prior migrations) are correctly recorded in
`_migrations` and are not reapplied.

## Defects found and fixed during live testing (before this document was written)

Two genuine repository bugs were found by running the live integration
tests (not by code review) and fixed before this build was considered
complete:

1. `UserRepository` and `SessionRepository` threw the generic
   `NotFoundError` base class instead of the specific
   `UserNotFoundError`/`SessionNotFoundError` subclasses their own
   `errors.ts` module defines — every other auth repository already used
   the specific subclass correctly. Fixed by importing and throwing the
   specific error class in both files.
2. `AccessEventRepository.record()` inserted into
   `audit.access_events` via the plain `withTransaction` even when a
   non-null `tenantId` was supplied, which violates that table's RLS
   `WITH CHECK` (implicitly derived from its `USING` clause) since
   `app.tenant_id` was never set in-session — every such insert failed
   with a row-level-security violation. Fixed by setting
   `app.tenant_id` in-session before the insert (and equivalently in
   `listForUser`, which gained an optional `tenantId` parameter) when a
   non-null tenant is supplied. A related test-design bug — a
   transaction-rollback test asserting an over-broad `user_id != $1`
   count instead of a genuine orphan check — was also corrected to test
   what it actually intended to test (`NOT EXISTS` against
   `identity.users`).

Both fixes were verified by re-running the full live-integration suite
to green before proceeding.
