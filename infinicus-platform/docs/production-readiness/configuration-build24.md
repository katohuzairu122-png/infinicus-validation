# BUILD-24 — Secrets and Configuration Management: Configuration

## Environment variables (canonical inventory)

The authoritative list is `packages/configuration/src/secrets.ts`'s `SECRET_INVENTORY` — this table mirrors it and must be kept in sync (the two drifting apart is itself a real bug; `.env.example` is the third mirror, also kept in sync).

| Name | Classification | Required | Owner | Rotation policy | Notes |
|---|---|---|---|---|---|
| `DATABASE_URL` | secret | yes | platform-database | 90 days | Application (least-privilege) connection string |
| `ADMIN_DATABASE_URL` | secret | no (deploy/CI-only) | platform-database | 90 days | Never read by the running app process |
| `NODE_ENV` | non-secret | no | platform | — | Resolves `loadConfig()`'s `env` field |
| `PORT` | non-secret | no | platform | — | Default `3000` |
| `LOG_LEVEL` | non-secret | no | platform | — | Default `info` (prod) / `debug` (else) |
| `RATE_LIMIT_MAX` | non-secret | no | platform | — | Default `100` |
| `RATE_LIMIT_WINDOW_MS` | non-secret | no | platform | — | Default `60000` |
| `DB_POOL_MIN` | non-secret | no | platform-database | — | Default `2` |
| `DB_POOL_MAX` | non-secret | no | platform-database | — | Default `10` |
| `DB_IDLE_TIMEOUT_MS` | non-secret | no | platform-database | — | Default `30000` |
| `DB_CONNECTION_TIMEOUT_MS` | non-secret | no | platform-database | — | Default `5000` |
| `DB_STATEMENT_TIMEOUT_MS` | non-secret | no | platform-database | — | Default `30000` |

This is the *complete* set — verified by grepping every `process.env.` reference in `apps/`/`packages/`/`layers/`/`infrastructure/` source (excluding tests), not assumed. The pre-existing `.env.example` (predating this monorepo's real configuration schema) listed `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`/`JWT_SECRET`/`JWT_EXPIRY`/`SENTRY_DSN` — none of which any code in this repository reads. This build removed them from `.env.example` rather than perpetuating a fictitious inventory.

## Startup validation

`loadConfig(env)`:
1. Resolves `env.NODE_ENV` to one of `development`/`staging`/`production`/`test` (defaults to `development`).
2. Requires `DATABASE_URL` (throws `ConfigurationError` if missing — pre-existing behavior, unchanged).
3. **New in BUILD-24:** if `env === 'production'` and `DATABASE_URL` matches a known local/CI credential pattern (`localhost`, `127.0.0.1`, `local_admin_pw`, `local_app_pw`, `ci_admin_pw`, `ci_app_pw`, `infinicus_test_admin`, `app_test_user`, `infinicus_ci_admin`), throws `ConfigurationError` — refuses to start.
4. Parses the remaining optional numeric fields with their documented defaults (unchanged).

`validateSecretInventory(provider)` is a separate, opt-in check (not called automatically inside `loadConfig()`, to avoid changing its existing error-on-first-missing-var behavior that callers already depend on) — aggregates every missing *required* secret into a single `ConfigurationError` message. Available for callers (e.g. a future ops CLI) that want the full picture rather than one variable at a time.

## Redaction configuration

`packages/observability`'s `createLogger()` applies `DEFAULT_REDACT_PATHS` (imports `@infinicus/configuration`'s `SECRET_REDACTION_LOG_PATHS` plus `req.headers.authorization`) to every logger by default — no caller opt-in required. Additional paths can be merged in via `CreateLoggerOptions.redactPaths`.

`redactSecretValues(text, provider)` is called explicitly wherever free-form text (an error's `.message`, a caught exception re-thrown as a string) might contain a literal secret value — not wired in automatically, since it requires the caller to have or construct a `SecretProvider`.

## Rotation policy

`DATABASE_URL`/`ADMIN_DATABASE_URL`: 90-day recommended rotation, enforced via `rotate-db-credential.sh`'s `VALID UNTIL` (Postgres refuses login past that timestamp — enforced server-side, not merely documented) and tracked in `platform.secret_rotation_events`. See operating-procedure-build24.md for the exact rotation command.
