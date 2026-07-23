# BUILD-25 — Logging, Monitoring, and Alerting: Test Evidence

## New tests

```
packages/observability/tests/errorTracking.test.ts                        4 tests
packages/observability/tests/tracing.test.ts                              5 tests
packages/database/tests/error-events.integration.test.ts                  8 tests (7 run, 1 CI-skip guard)
packages/database/tests/alert-events.integration.test.ts                  8 tests (7 run, 1 CI-skip guard)
packages/database/tests/observability-audit-cli.integration.test.ts       7 tests (6 run, 1 CI-skip guard)
apps/api/tests/observability.integration.test.ts                          5 tests (4 run, 1 CI-skip guard)
```

## A genuine bug found and fixed via this build's own live testing

`GET /v1/metrics` initially returned a real `500` — `invalid input syntax for type uuid: ""` — from `ErrorEventRepository.countSince()`/`getOutboxBacklog()`. Root cause: the exact class of bug BUILD-19 already discovered (a Postgres session variable set via `SET LOCAL` on a pooled connection reverts to an empty string, not `NULL`, once that transaction commits; a subsequent transaction reusing the same physical connection then fails `''::uuid`). This build's own live testing caught the same failure mode recurring, in new code. Fixed by applying BUILD-19's own nil-UUID sentinel pattern (`00000000-0000-0000-0000-000000000000`) to `ErrorEventRepository.record()`/`countSince()`/`listRecent()` and `getOutboxBacklog()` — re-verified, all green.

## Live drills (genuinely executed against the local dev database)

### Outbox backlog, real accumulated data

```
$ DATABASE_URL=$ADMIN_DATABASE_URL node observability-audit.cjs check-outbox-lag 10 60
ERROR: outbox pending count 2153 exceeds threshold 10.   (exit 1)

$ DATABASE_URL=$ADMIN_DATABASE_URL node observability-audit.cjs check-outbox-lag 100000 999999999
Outbox lag within thresholds: {"pendingCount":2153,...}  (exit 0)
```
Confirms real backlog data (this session's accumulated, never-consumed outbox events across every prior build — expected, since no message broker is connected to this platform yet) and correct threshold enforcement in both directions.

### RLS-scoped vs. admin-scoped outbox visibility

```
app_test_user (no tenant context set): {"pendingCount":0,...}
infinicus_test_admin (bypasses RLS):    {"pendingCount":2149,...}
```
Confirms `getOutboxBacklog()`'s documented RLS caveat is real, not just asserted.

### Error rate, alert lifecycle

- `check-error-rate 60 100000` → within threshold, real count (19 errors, from earlier live drills in this and prior builds).
- `trigger-alert` → real UUID returned; `resolve-alert <id>` → succeeds.
- `summary 60` → real computed JSON (error count, outbox backlog, active alert count) — no fabricated SLO percentage (see known-limitations).

### GET /v1/metrics, full auth chain

- No auth → `401`.
- Authenticated, `member` role (no `platform:admin`) → `403`.
- Authenticated, `owner` role (has `platform:admin`) → `200`, real pool/error/outbox/alert data.

### Error-handler persistence

A deliberately-thrown unhandled error in a minimal Fastify harness (using the real `errorHandlerPlugin`) produces a real `observability.error_events` row within the fire-and-forget persistence window, with the correct `route`/`statusCode`/`message`.

## Full regression (this build's changes against every prior build)

```
packages/database:        36 test files, 2784 passed | 21 skipped (2805 total)
packages/configuration:     2 test files,   31 passed
packages/observability:     3 test files,   18 passed
packages/authentication:    3 test files,   45 passed | 1 skipped (46 total)
packages/authorization:     2 test files,   25 passed | 1 skipped (26 total)
packages/onboarding:        1 test file,    12 passed | 1 skipped (13 total)
packages/workflow:          1 test file,    12 passed | 1 skipped (13 total)
apps/web:                   2 test files,   14 passed
apps/api:                   5 test files,   36 passed | 5 skipped (41 total) — see note below
```

**Note on `apps/api/tests/api.integration.test.ts`:** one pre-existing test (`lists businesses (paginated) for a user with an active membership`, from BUILD-21, untouched by this build) fails deterministically in this specific long-lived local development database — not a flake, and not caused by this build. Its fixture tenant (`T1`, a hardcoded UUID reused across every `api.integration.test.ts` run in this session) has accumulated 104+ business records over this session's dozens of repeated test invocations across BUILD-21 through BUILD-25, exceeding the route's default `pageSize` of 20 — a freshly created business is no longer guaranteed to appear on page 1. Confirmed via direct row count (`SELECT count(*) FROM platform.businesses WHERE tenant_id = '...'` → 104) and by re-running the single test in isolation (still fails, ruling out concurrency). This is purely an artifact of this session's long-lived shared database never being reset between builds — it cannot occur in CI, which provisions a fresh, empty database on every run (`.github/workflows/ci.yml`, BUILD-23). Not modified, per this build's scope boundary (BUILD-21's test/fixture design is out of scope for BUILD-25 to change).

## Static checks

```
pnpm typecheck  → 26/26 tasks pass
pnpm lint       → 23/23 packages pass (0 errors; 5 pre-existing
                  console-statement warnings in packages/database,
                  unrelated to this build)
pnpm build      → 23/23 packages build successfully
```

## Frozen-migration byte-identity

```
git status --porcelain infrastructure/database/migrations/
→ only 0148_create_observability_schema.sql is new — 0001-0147 untouched.
```

## Empty-database install / migration idempotency

Migration `0148` applied cleanly to the local dev database continuing from the `0147` baseline; `observability.error_events`/`observability.alert_events` verified present with their indexes/RLS. Re-running `migration-gate.sh` reports `skip` for `0148`.
