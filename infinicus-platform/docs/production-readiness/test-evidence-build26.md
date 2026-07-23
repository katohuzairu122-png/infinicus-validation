# BUILD-26 — Security, Privacy, and Retention: Test Evidence

## New tests

```
apps/api/tests/security.integration.test.ts                              8 tests (7 run, 1 CI-skip guard)
apps/api/tests/dast-scan.integration.test.ts                             2 tests (1 run, 1 CI-skip guard)
packages/database/tests/delete-tenant-data.integration.test.ts           3 tests (2 run, 1 CI-skip guard)
```

## Dependency scanning (real, live-executed)

`pnpm audit` before any remediation: **11 findings (6 moderate, 3 high, 2 critical)** across `vitest`/`vite`/`esbuild` (dev-tooling only — every `"test"` script in this monorepo runs `vitest run`, never `vitest --ui`, the specific flag the critical advisory requires), `sharp` (transitive via Next.js's `next/image`, which `apps/web` never imports — verified via grep), and `postcss` (build-time CSS processing).

Attempted a `pnpm.overrides` fix for `vite`/`esbuild` to their patched versions — **this broke every `apps/api` test** (`ReferenceError: __vite_ssr_exportName__ is not defined`), because the unbounded `>=6.4.3` override resolved to `vite@8.1.5`, incompatible with vitest 1.6.1's internal SSR transform pipeline (which expects `vite@~5.x`). **Reverted** — a genuine example of a "security fix" that would have broken working code for a vulnerability requiring a flag (`--ui`) this codebase never passes. Kept only the safe `postcss` override (independent of vitest's internals).

`check-dependency-vulnerabilities.mjs` (the real CI gate) after remediation: **1 remaining finding (`sharp`, high), allowlisted with a verified justification** (`next/image` never imported). `vitest`'s critical finding is separately suppressed via `pnpm.auditConfig.ignoreCves` (matches by CVE). Exit code 0.

## SAST (real, live-executed)

`eslint-plugin-security` wired into the existing flat ESLint config, run against the full workspace: **0 new findings** (5 pre-existing, unrelated console-statement warnings only, same as every prior build's own lint evidence).

## DAST (real, live-executed against a real running instance)

Booted a real `apps/api` process (`node dist/server.js`, not `app.inject()`) on a real TCP port, ran `dast-scan.sh` against it with `curl`:

```
OK: /v1/health sets 'x-content-type-options'
OK: /v1/health sets 'x-frame-options'
OK: /v1/health sets 'strict-transport-security'
OK: /v1/nonexistent-route does not leak a stack trace
OK: SQLi-style login payload rejected with 400
OK: XSS-style payload was not reflected
OK: GET /v1/metrics without auth correctly rejected (401)
=== DAST scan passed: all checks green ===
```

Also wired into an automated test (`dast-scan.integration.test.ts`) booting the app via `app.listen()`, mirroring BUILD-23's `smoke-test.integration.test.ts` pattern exactly.

## Two genuine bugs found and fixed via this build's own live testing

1. **Rate-limit test caught `errorHandler.ts` silently redacting a legitimate `429` to `500`.** First run: `expected [ 500, 500 ] to include 429`. Root-caused to `@fastify/rate-limit` throwing a plain `Error` with `.statusCode = 429` but a generic `.name`, which the name-based `statusCodeFor()` lookup couldn't see. Fixed; re-verified: first 5 requests `200`, 6th/7th `429`.
2. **`delete-tenant-data.mjs`'s first live drill caught a cross-tenant data-safety bug.** Real run against a populated scratch tenant failed with `ERROR: update or delete on table "roles" violates foreign key constraint "membership_roles_role_id_fkey"`. Investigation revealed the actual danger: `tenancy.roles`' RLS policy (`tenant_id IS NULL OR tenant_id = current_setting(...)`) makes shared system roles visible to every tenant's session — a blanket `DELETE FROM tenancy.roles` relying only on RLS visibility would have deleted **every tenant's shared system roles**, not just the target tenant's, the instant the FK constraint didn't happen to block it first. Fixed by adding an explicit `WHERE tenant_id = '<TENANT_ID>'` to every table with a literal `tenant_id` column (verified per-table via `information_schema.columns`, not assumed — 2 of 442 discovered tables lack one and are handled specially: `tenancy.tenants` itself, and `identity.api_key_references`, whose own RLS policy scopes correctly via its owning service account with no OR-NULL fallback).

## Live drills (genuinely executed)

### Full tenant-deletion drill (manual, then codified as an automated test)

Created a real scratch tenant (`Deletion Drill Tenant`) with a workspace and a business row → ran `delete-tenant-data.mjs` for real (after the fix above) → **verified**:
- Tenant, workspace, business all confirmed deleted (`count(*) = 0` for all three).
- All 4 system roles (`owner`/`admin`/`member`/`viewer`, `tenant_id IS NULL`) confirmed **intact** — the critical safety property.
- A pre-existing, unrelated tenant fixture's 113 accumulated business rows (from this session's long history of other builds' tests) confirmed **completely unaffected**.
- Audit record in `platform.data_deletion_events` correct (`tenant_name`, `deleted_by`, `deleted_at`).

The automated test (`delete-tenant-data.integration.test.ts`) codifies exactly this drill, plus asserts a *second, concurrently-existing* tenant's data survives untouched, and that the script refuses to run against a BYPASSRLS connection.

### Security headers, live HTTP inspection

```
x-content-type-options: nosniff
x-frame-options: SAMEORIGIN
strict-transport-security: max-age=31536000; includeSubDomains
referrer-policy: no-referrer
x-xss-protection: 0
```

Confirmed present on a real response, and that `/documentation/json` (Swagger UI's spec endpoint) still returns `200` with CSP disabled.

## Full regression (this build's changes against every prior build)

```
packages/database:        37 test files, 2786 passed | 22 skipped (2808 total)
packages/configuration:     2 test files,   31 passed
packages/observability:     3 test files,   18 passed
packages/authentication:    3 test files,   45 passed | 1 skipped (46 total)
packages/authorization:     2 test files,   25 passed | 1 skipped (26 total)
packages/onboarding:        1 test file,    12 passed | 1 skipped (13 total)
packages/workflow:          1 test file,    12 passed | 1 skipped (13 total)
apps/web:                   2 test files,   14 passed
apps/api:                   7 test files,   44 passed | 7 skipped (51 total)
```

Every prior domain's suite passed unchanged, including `apps/api/tests/api.integration.test.ts`'s previously-noted-flaky (BUILD-25's own report) paginated-listing test, which passed cleanly in this run.

## Static checks

```
pnpm typecheck  → 26/26 tasks pass
pnpm lint       → 23/23 packages pass (0 errors; eslint-plugin-security
                  active, 0 new findings; 5 pre-existing unrelated
                  console-statement warnings in packages/database)
pnpm build      → 23/23 packages build successfully
```

## Frozen-migration byte-identity

```
git status --porcelain infrastructure/database/migrations/
→ only 0149_create_data_deletion_events.sql is new — 0001-0148 untouched.
```

## Empty-database install / migration idempotency

Migration `0149` applied cleanly to the local dev database continuing from the `0148` baseline; `platform.data_deletion_events` verified present with its index. Re-running `migration-gate.sh` reports `skip` for `0149`.
