# BUILD-27 — Performance and Load Readiness: Configuration

## `load-test.mjs` environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `BASE_URL` | yes | — | Base URL of the running `apps/api` instance to load-test (e.g. `http://localhost:3000`). Script exits 1 if unset. |
| `CONCURRENCY` | no | `20` | Number of concurrent worker loops firing requests. |
| `REQUESTS` | no | `500` | Total request count across all workers. |
| `LOAD_TEST_HEADERS` | no | `{}` | JSON-encoded extra headers (e.g. an auth bearer token) merged into every request. |

Positional argument: target path (defaults to `/v1/health`).

No new production runtime environment variables are introduced by this build — `load-test.mjs` is an operational/CI-adjacent tool, not part of the deployed application, and does not read or require any secret.

## Existing configuration exercised by this build (no changes)

- **`RATE_LIMIT_MAX`** (`@fastify/rate-limit`, wired in BUILD-21) — this build's load tests are the first to genuinely exercise it under real concurrent load. Default (`100`) correctly throttles a 500-request/concurrency-20 burst to `/v1/health` (see test-evidence-build27.md); tests that need raw, unthrottled engine throughput override it (`RATE_LIMIT_MAX=100000`) rather than changing the production default.
- **`DATABASE_URL` / `ADMIN_DATABASE_URL`** — used unchanged by the new live test suites, following the same `describe.runIf(!!process.env.DATABASE_URL)` guard convention as every prior build's integration tests.

## Fixed-script configuration changes (bug fixes, not new config surface)

`export-tenant.sh` and `delete-tenant-data.mjs` (BUILD-22/BUILD-26) take the same environment variables as before (`DATABASE_URL`, `ADMIN_DATABASE_URL`, `TENANT_ID`, `OUTPUT_FILE`/`DELETED_BY`) — no new required variables were added. Internally, both now also discover and iterate the target tenant's `tenancy.workspaces` rows (via `ADMIN_DATABASE_URL`, already a required input) to correctly scope tables whose RLS requires `app.workspace_id`; this is an internal correctness fix, not a new configuration input for callers.

## No new database configuration

No migrations, roles, or grants are added by this build. The append-only (`forbid_mutation`) triggers exercised by `delete-tenant-data.mjs`'s fix already existed across every domain's original migrations (BUILD-05 through BUILD-17) — this build discovers and respects them, it does not create or modify any trigger.
