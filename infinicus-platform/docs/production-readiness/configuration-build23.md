# BUILD-23 — Deployment and Environments: Configuration

## Environment variables — deployment scripts (new)

None of this build's scripts introduce new *application* environment
variables (`InfinicusConfig` is unchanged) — every new variable below is
consumed only by the deployment tooling itself, at invocation time, not
by the running `apps/api` process.

| Variable | Used by | Notes |
|---|---|---|
| `ENVIRONMENT` | `deploy.sh` | Required. One of `local`\|`test`\|`staging`\|`production`. |
| `DEPLOYED_BY` | `deploy.sh` | Optional, default `unknown`. Recorded on the `deployment_events` row. |
| `BASE_URL` | `smoke-test.sh`, `deploy.sh` | Optional, default `http://localhost:3000`. |
| `BACKUP_RETENTION_DAYS` | (BUILD-22, unchanged) | N/A here. |
| `BASE_BACKUP_DIR`, `RECOVERY_DATA_DIR`, `RECOVERY_PORT`, `RECOVERY_TARGET_TIME`, `ARCHIVE_DIR` | (BUILD-22, unchanged) | N/A here. |
| `MAINTENANCE_DATABASE_URL`, `TARGET_DATABASE_URL` | (BUILD-22's `restore.sh`, unchanged) | N/A here. |
| `ADMIN_DATABASE_URL` / `APP_ROLE` | `grant-app-role.sh` | `ADMIN_DATABASE_URL` required (CREATEDB/GRANT-capable role); `APP_ROLE` optional, default `app_test_user`. |
| `PGCLUSTER_VERSION` / `PGCLUSTER_NAME` / `BASE_BACKUP_DIR` | (BUILD-22, unchanged) | N/A here. |

`DATABASE_URL` is reused by every script exactly as it already meant in
BUILD-21/22 — a role with migration/full-read privileges for
`migration-gate.sh`/`deploy.sh`, the RLS-restricted application role for
the running `apps/api` process itself. No new meaning was introduced.

## `packages/database`'s new `DeploymentEventRepository`

No new environment configuration — it uses the same `createPool()`/
`withTransaction()` foundation every other repository in this package
already relies on.

## CI workflow configuration (`.github/workflows/ci.yml`)

The workflow's own job-scoped environment (`CI_ADMIN_USER`,
`CI_ADMIN_PASSWORD`, `CI_APP_USER`, `CI_APP_PASSWORD`, `CI_DB_NAME`) are
**local, disposable, CI-only test credentials** — generated fresh for
each ephemeral `postgres:16` service container GitHub Actions spins up
per run, never persisted, never real production secrets. This mirrors
the exact same "local disposable test credentials only" convention this
entire session's own local development database has used throughout
(never committed, never real). No secret is stored in the workflow file
itself beyond these disposable, non-production values.

## `turbo.json` — one required change

`test`'s task definition gained `"env": ["DATABASE_URL", "ADMIN_DATABASE_URL"]`.
Turborepo 2.x defaults to `envMode: "strict"`, which — undiscovered
until this build actually needed `turbo run test` to work with live
database credentials passed through from a CI step — silently drops any
environment variable not explicitly declared before it reaches a task's
child process. Without this declaration, every live-integration test's
`describe.runIf(!!process.env.DATABASE_URL)` guard silently evaluated to
skip everything, with `turbo run test` still reporting overall success
(0 failures, because nothing meaningful actually ran) — a genuinely
dangerous false-green. This is now fixed for every future `turbo run
test` invocation, not just this build's own CI job.

## Docker build configuration (`apps/api/Dockerfile`, `.dockerignore`)

Build context is the monorepo root (`infinicus-platform/`), not
`apps/api/` — the image needs its `workspace:*` dependencies
(`@infinicus/database`, `@infinicus/configuration`, etc.) built alongside
it. `.dockerignore` excludes `node_modules/`, `dist/`, `.git/`, env
files, and docs to keep the build context lean and prevent host-built
artifacts (which may target a different platform than the container) or
secrets from being copied in. Node version pinned to `22` (matching this
development environment's own runtime and this repository's newest
code, e.g. `Fastify`/`fetch` usage) — no `engines` field previously
constrained this choice; `configuration-build23.md` records it here as
the frozen decision.
