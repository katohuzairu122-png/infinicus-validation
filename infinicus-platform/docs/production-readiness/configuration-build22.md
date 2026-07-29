# BUILD-22 — Production Database and Recovery: Configuration

## Environment variables — connection pooling (new)

| Variable | Default | Used by |
|---|---|---|
| `DB_POOL_MIN` | `2` | Minimum idle connections `pg.Pool` keeps open. |
| `DB_POOL_MAX` | `10` | Maximum concurrent connections. |
| `DB_IDLE_TIMEOUT_MS` | `30000` | Milliseconds an idle client sits in the pool before being closed. |
| `DB_CONNECTION_TIMEOUT_MS` | `5000` | Milliseconds to wait for a new connection to establish before failing. |
| `DB_STATEMENT_TIMEOUT_MS` | `30000` | Server-side `statement_timeout` set per session — Postgres itself cancels a query running longer than this, regardless of client behavior. |

All five are read by `packages/configuration`'s `loadConfig()` (via
`optionalInt()`, the same fail-closed-on-non-numeric pattern every other
optional integer setting already uses) and passed through by
`apps/api/src/server.ts` into `createPool()`. Every other caller of
`createPool()` in the codebase (every live integration test) continues
to pass only a connection string and picks up the same defaults as
before this build — no existing test's behavior changed.

## No new environment variables for backup/restore/PITR/export

Deliberately: those are operator-invoked scripts, not
always-running-service configuration. Each script takes its inputs as
explicit environment variables at invocation time (documented in each
script's own header comment and in `operating-procedure-build22.md`),
not baked into `InfinicusConfig` — a backup job's `DATABASE_URL` is
typically a different role (admin/full-read) from the running
application's own `DATABASE_URL` (RLS-restricted), so conflating them
into one config surface would be actively wrong, not just unnecessary.

## Script parameterization summary

| Script | Key inputs |
|---|---|
| `backup.sh` | `DATABASE_URL` (must have full read access — see security-controls), `BACKUP_DIR` |
| `restore.sh` | `MAINTENANCE_DATABASE_URL`, `TARGET_DATABASE_URL`, backup file path |
| `prune-backups.sh` | `BACKUP_DIR`, `BACKUP_RETENTION_DAYS` (default 30) |
| `export-tenant.sh` | `DATABASE_URL` (must be RLS-restricted — see security-controls), `TENANT_ID`, `OUTPUT_FILE` |
| `enable-wal-archiving.sh` / `disable-wal-archiving.sh` | `PGCLUSTER_VERSION`, `PGCLUSTER_NAME`, `ARCHIVE_DIR` |
| `pitr-base-backup.sh` | `PGCLUSTER_VERSION`, `PGCLUSTER_NAME`, `BASE_BACKUP_DIR` |
| `pitr-restore.sh` | `BASE_BACKUP_DIR`, `ARCHIVE_DIR`, `RECOVERY_DATA_DIR`, `RECOVERY_PORT`, `RECOVERY_TARGET_TIME` |

## No new secrets

No script or code change in this build introduces a new credential.
`backup.sh`/`export-tenant.sh` both take an existing connection string
as input (the same admin/app credentials already documented and used
throughout this repository's prior builds) — neither generates, stores,
or logs a credential of its own.
