# BUILD-27 — Performance and Load Readiness: Operating Procedure

## Running a load test against a live instance

```bash
BASE_URL="https://api.example.com" \
CONCURRENCY="20" REQUESTS="500" \
  node infrastructure/deployment/scripts/load-test.mjs /v1/health
```

Prints a JSON report (`totalRequests`, `durationMs`, `throughputReqPerSec`, `successCount`/`failureCount`, `latencyMs.{min,p50,p95,p99,max}`) to stdout and exits `0` unconditionally — this is a measurement tool, not a pass/fail gate. A non-zero `failureCount` prints a `WARNING` line; the operator (or a wrapping CI/promotion-gate script) decides what threshold is acceptable for the environment under test, since "acceptable" differs between an unauthenticated `/v1/health` probe and a real authenticated write endpoint.

To measure raw engine throughput without the production rate limiter's protective ceiling (e.g. capacity planning, not production-traffic simulation), boot the target instance with a raised `RATE_LIMIT_MAX` first — never raise it in a real production environment for this purpose.

## Running the database/domain concurrency suite

```bash
cd packages/database
DATABASE_URL="postgresql://app_test_user:PW@HOST:5432/DB" \
ADMIN_DATABASE_URL="postgresql://admin_role:PW@HOST:5432/DB" \
  npx vitest run tests/performance.integration.test.ts
```

Each of the 6 live tests (`describe.runIf(!!DATABASE_URL)`) logs its own real measured duration via `console.log('[PERF] ...')` — read these directly for the current environment's numbers rather than trusting a stale value in a doc. The suite uses a **fixed** tenant/workspace/business fixture (`ON CONFLICT DO NOTHING`, ids `77777777-...`) so repeated runs are idempotent and additive (each large-tenant-test run adds another 500 businesses to the same tenant, which is intentional — it lets the large-tenant case grow over repeated CI runs rather than resetting).

## Cleaning up test-fixture tenants

Use the (now workspace-scoping-aware) erasure script:

```bash
DATABASE_URL="postgresql://app_test_user:PW@HOST:5432/DB" \
ADMIN_DATABASE_URL="postgresql://admin_role:PW@HOST:5432/DB" \
TENANT_ID="<uuid>" DELETED_BY="<actor>" \
  node infrastructure/database/scripts/delete-tenant-data.mjs
```

Read the final console line: `Deleted tenant ...` means full erasure; `Partially erased tenant ...` means the tenant has real rows in one or more append-only audit-trail tables that cannot be deleted (by design — see known-limitations-build27.md) — the script still removes everything that legitimately can be removed and records the full retained/blocked breakdown in `platform.data_deletion_events.table_row_counts`.

## Reading capacity-plan / SLO numbers

See test-evidence-build27.md for this build's actual measured numbers (the source of truth) and the capacity plan / SLO targets derived from them. Re-run the same commands above periodically (e.g. after significant schema or infrastructure changes) and compare against those baselines — a build's own numbers are a snapshot of one point in time on one sandboxed machine, not a permanent guarantee for a different production environment's hardware.

## Rollback

See rollback-procedure-build27.md. This build ships no migrations and no production runtime code changes (only operational scripts, tests, and two bug fixes to existing operational scripts) — rollback is a plain `git revert` of the commit, with no database or deployment-state implications.
