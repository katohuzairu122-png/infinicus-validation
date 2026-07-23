# BUILD-30 — Production Acceptance and Launch: Configuration

## No new required environment variables for the deployed application

`launch-acceptance-check.mjs` requires the same `DATABASE_URL`/`ADMIN_DATABASE_URL` pair every migration/audit script in this codebase already requires — no new variable name for the running `apps/api` process itself.

## `ACCEPTANCE_CHECK_PORT` (optional, script-only)

`launch-acceptance-check.mjs` boots a temporary in-process instance on port `34701` by default (matching the port-selection convention of BUILD-27/28/29's own integration tests, which each pick a distinct high port to avoid colliding with a real running instance or each other). Override with `ACCEPTANCE_CHECK_PORT` if `34701` is already in use in a given environment. This is not a production configuration value — it only affects this one acceptance-check script's own temporary listener.

## Dependency-scan allowlist additions are code, not configuration

The 4 new allowlist entries added to `check-dependency-vulnerabilities.mjs` (esbuild/vite dev-server advisories) are, like BUILD-26's original two entries, hardcoded in the script itself with an inline justification — deliberately not environment-configurable, so a suppression can't be silently widened per-environment without a reviewable code change.

## No new secrets
