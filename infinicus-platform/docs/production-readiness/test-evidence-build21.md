# BUILD-21 — Governed Application API: Test Evidence

All tests below were executed against a live local disposable PostgreSQL
16 instance (migrations `0001`–`0145` — this build added `0142`–`0145`).
Every number below is from an actual `vitest run`/`tsc`/`eslint`/`turbo`
execution, not asserted from code review.

## New test files (this build)

| File | Package | Kind | Result |
|---|---|---|---|
| `tests/api-idempotency.integration.test.ts` | `@infinicus/database` | Live integration | 7 passed, 1 skipped (guard) |
| `tests/loadConfig.test.ts` | `@infinicus/configuration` | Unit | 9 passed |
| `tests/logger.test.ts` | `@infinicus/observability` | Unit | 5 passed |
| `tests/api.integration.test.ts` | `@infinicus/api` | Live integration | 26 passed, 1 skipped (guard) |

**Totals:** 14 pure unit tests, 33 live-database integration tests, 47
executed assertions across 4 new files.

## Coverage by requirement (spec §6)

- **Unit tests**: `loadConfig.test.ts` covers required/optional env vars,
  missing `DATABASE_URL` (fail-closed), non-numeric `PORT`, and default
  values. `logger.test.ts` covers `createLogger`, `withCorrelationId`
  (child-logger binding), and `logAuditEntry`'s structured output shape.
- **Integration tests**: `api-idempotency.integration.test.ts` covers
  the new repository directly (claim, replay-in-progress,
  complete-then-replay, conflict-on-reused-key-different-body,
  independence across routes, independence across tenants, RLS
  cross-tenant independence). `api.integration.test.ts` exercises the
  full route surface end to end via `app.inject()` against a real
  Fastify application and database: auth (register, weak-password
  rejection, pending-account login rejection, wrong-password rejection,
  successful login, session validation, missing-token rejection,
  correlation-id echo, logout-then-session-invalid), onboarding (begin,
  unauthenticated rejection, active-resume found/null), businesses
  (missing tenant headers, no-membership rejection, list + workflow
  view with a real owner membership), ABA decisions (permission denial
  for a viewer role, a full approve decision against a real ABA intake
  package built via the same proven BI→DT→SIM→ADI→ABA fixture-chain
  pattern established in BUILD-20, missing-idempotency-key rejection,
  same-key-same-body replay, same-key-different-body conflict), OM
  outcomes (a full outcome recording against a real monitored action),
  OpenAPI documentation (`/documentation` HTML, `/documentation/json`
  spec content), and rate-limit headers.
- **Authorization and tenant-isolation tests**: covered directly above
  (membership-required 404, permission-denied 403 for a viewer role) and
  indirectly by the RLS cross-tenant independence test in the
  idempotency repository suite.
- **Failure-path tests**: covered throughout — missing auth header,
  malformed session, missing tenant headers, no membership, wrong
  permission, missing idempotency key, conflicting idempotency key.
- **Idempotency tests**: dedicated suite at both the repository layer
  (`api-idempotency.integration.test.ts`) and the HTTP layer
  (`api.integration.test.ts`'s three idempotency-specific tests).
- **Migration tests**: frozen-migration byte-identity re-verified
  (below); empty-database install and migration-idempotency re-run both
  executed (below) — see spec §6 "migration tests where relevant."
- **Security tests**: the fail-closed authentication/authorization tests
  above, plus the RLS cross-tenant isolation test.
- **Regression tests**: full existing suite across every package
  re-run unchanged (below).

## Full regression (this build's changes against every prior build)

```
packages/database:       24 test files, 2726 passed | 10 skipped (2736 total)
packages/configuration:   1 test file,      9 passed
packages/observability:   1 test file,      5 passed
packages/authentication:  3 test files,    45 passed | 1 skipped (46 total)
packages/authorization:   2 test files,    25 passed | 1 skipped (26 total)
packages/workflow:        1 test file,     12 passed | 1 skipped (13 total)
packages/onboarding:      1 test file,     12 passed | 1 skipped (13 total)
apps/web:                 1 test file,     10 passed
apps/api:                 1 test file,     26 passed | 1 skipped (27 total)
```

Every prior domain's suite (`da`, `bo`, `bi`, `dt`, `simulation`, `adi`,
`aba`, `om`, `cl`, `auth`, `onboarding`, plus all `migration-stage2*`
structural suites, plus the new `api-idempotency` suite) passed
unchanged.

## Static checks

```
pnpm typecheck  → 8/8 packages with a typecheck script pass
                  (configuration, database, observability, workflow,
                  authentication, authorization, onboarding, api)
pnpm lint       → 23/23 packages pass (0 errors; 5 pre-existing
                  console-statement warnings in packages/database,
                  unrelated to this build)
pnpm build      → 23/23 packages build successfully, including
                  `next build` for @infinicus/web and `tsc` for @infinicus/api
```

## Frozen-migration byte-identity

```
git status --porcelain infinicus-platform/infrastructure/database/migrations/
→ only 0142_create_api_schema.sql, 0143_create_api_indexes.sql,
  0144_create_api_rls_policies.sql, 0145_create_api_triggers.sql
  are untracked/new — 0001-0141 untouched.
```

## Empty-database install test

Applied migrations `0001`–`0145` to a freshly created, previously-empty
database in one pass: zero errors, all 145 migrations reported `apply`.
Verified `api.idempotency_keys` exists with its `UNIQUE (tenant_id,
idempotency_key, route)` constraint, its RLS policy
(`idempotency_keys_isolation`, `relrowsecurity = t`), and its
`set_updated_at_idempotency_keys` trigger all present. The scratch
database was dropped after verification.

## Migration idempotency test

Re-ran `runMigrations()` against the already-migrated database: every
one of the 145 migrations (including the four new `0142`–`0145`)
reported `skip`, confirming the migration runner's idempotency guarantee
holds for this build's additions too.

## Defects found and fixed during this build's own testing

1. **Missing `pg`/`@types/pg` devDependency in `apps/api`.** The live
   integration test opens its own admin `Pool` for fixture setup
   (mirroring every `packages/database` integration test's convention)
   but `apps/api/package.json` had never declared `pg` at all — the
   first test run failed at module resolution (`Failed to load url
   'pg'`). Fixed by adding `pg`/`@types/pg` as devDependencies (the
   running application itself never imports `pg` directly; it only ever
   goes through `@infinicus/database`'s `createPool()`).
2. **Test-fixture tenant slug collision across two different test
   files.** `packages/database/tests/api-idempotency.integration.test.ts`
   (written earlier in this same build) already claims tenant slugs
   `api-t1`/`api-ws1` for its own fixture tenant. The newly written
   `apps/api/tests/api.integration.test.ts` independently chose the
   same slugs for a *different* tenant id, and Postgres's
   `tenants_slug_key` unique constraint correctly rejected the second
   insert. Fixed by renaming the HTTP-layer test's fixture slugs to
   `api-http-t1`/`api-http-ws1`.
3. **`ERROR_STATUS_CODES` table keyed off names that never occur at
   runtime.** See `security-controls-build21.md` for the full
   explanation — every `packages/database` domain error subclass
   collapses to one of four generic base names (`NotFoundError`,
   `ConflictError`, `ValidationError`, `InvalidTransitionError`) at
   runtime, not its own specific-looking subclass name. The first
   version of the table enumerated the (dead) specific names, causing a
   genuine 404 case (`MembershipNotFoundError`) to fall through to a
   redacted 500. Caught by the `rejects a tenant/workspace the user has
   no membership in` test (expected 404, got 500) and fixed by rewriting
   the table to key off the actual generic names.
4. **Invalid raw JSON-schema fragment for the logout route's 204
   response.** `response: { 204: { type: 'null', description: 'Logged
   out' } }` is not a schema shape `fastify-type-provider-zod`'s
   `jsonSchemaTransform` can resolve — it only surfaced when
   `GET /documentation/json` tried to generate the full OpenAPI spec
   (`FST_ERR_INVALID_SCHEMA: Invalid schema passed`), not at request
   time against the logout route itself. Fixed by using
   `z.null().describe('Logged out')` instead, which also required an
   explicit `reply.status(204).send(null)` (TypeScript then required the
   argument the schema now demands).
5. **Test expectation for `/documentation` was wrong for the installed
   `@fastify/swagger-ui@6.1.0`.** The test asserted a `302` redirect
   (the older swagger-ui behavior, redirecting `/static/index.html` to
   the prefix root); this version instead serves the HTML directly at
   `200` on the prefix root itself. Fixed by correcting the test's
   expectation to `200` plus a `text/html` content-type check.
6. **Hardcoded `business_code` fixture literals with no test
   teardown.** Eight of the HTTP-layer test's business fixtures used
   fixed string literals (`'api-list-biz'`, `'decision-biz'`, etc.)
   under a persistent (not per-run-reset) database — the first full
   suite run succeeded, but a second run against the same database hit
   `businesses_code_tenant_unique` violations, since prior rows never
   get cleaned up (matching this whole session's established
   no-teardown, disposable-local-database testing convention). Fixed by
   parameterizing every business code through the file's existing
   `uc()` unique-code helper, already used elsewhere in the same file
   for review/assignment/decision codes.
