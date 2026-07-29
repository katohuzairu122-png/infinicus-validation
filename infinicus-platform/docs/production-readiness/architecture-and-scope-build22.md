# BUILD-22 — Production Database and Recovery: Architecture and Scope

**Build:** BUILD-22 (PROD-DB) · **Depends on:** BUILD-21 (completed) · **Status:** Complete

## Purpose

Deliver the operational capabilities a production PostgreSQL deployment
needs but that no prior build addressed: hardened connection pooling,
protection against concurrent migration races, a real readiness check
distinct from liveness, and a full backup/restore/PITR/retention/export
story with genuine, live-executed acceptance evidence — not documentation
asserting these things work, but scripts and tests that were actually run
against a live PostgreSQL 16 instance during this build.

## Scope interpretation

Spec §2's required scope ("production PostgreSQL, connection pooling,
migration locking, readiness, backups, point-in-time recovery, restore
testing, retention, data export, disaster recovery, RPO/RTO") describes
operational capabilities, not a new application feature or framework
choice — no root `CLAUDE.md` §4 gate applies (that section gates
*frontend framework* and *API HTTP framework* choices specifically;
this build uses tools already implied by CLAUDE.md §4's own
"PostgreSQL-compatible database architecture" directive: `pg_dump`,
`pg_restore`, `pg_basebackup`, and Postgres's own advisory-lock and WAL
mechanisms). No user check-in was required before implementation.

This is also the first build in the sequence whose deliverables are
partly **infrastructure scripts** (`infrastructure/database/scripts/`)
rather than exclusively TypeScript application code — consistent with
root `CLAUDE.md`'s own repository structure, which reserves
`infrastructure/` for exactly this kind of operational tooling (the
migrations themselves are the existing precedent: plain `.sql` files,
not a TypeScript abstraction).

## What was built

### 1. Connection pooling hardening (`packages/database/src/client.ts`)

`createPool()` previously only accepted `poolMin`/`poolMax`/`ssl`. Added:
`idleTimeoutMillis`, `connectionTimeoutMillis` (both passed straight to
`pg.Pool`), `statementTimeoutMillis` (set via libpq startup `options`,
since `pg.Pool` has no built-in statement-timeout option — this is a
server-side backstop against a runaway query holding a connection
indefinitely), and `applicationName` (visible in `pg_stat_activity`,
useful for identifying which service/instance owns a connection during
an incident). A new `poolStats()` export reports `totalCount`/
`idleCount`/`waitingCount` for the readiness endpoint and operational
monitoring. All new options are optional with the same defaults the
pool already used, so no existing caller's behavior changed.

`packages/configuration`'s `InfinicusConfig` gained five new fields
(`dbPoolMin`, `dbPoolMax`, `dbIdleTimeoutMs`, `dbConnectionTimeoutMs`,
`dbStatementTimeoutMs`, all with sane defaults), and `apps/api/src/server.ts`
now passes them through to `createPool()` — the only caller of
`createPool()` in the whole codebase that constructs its own config
today (every test file constructs a `Pool` directly or calls
`createPool()` with just a connection string, unaffected by this change).

### 2. Migration advisory locking (`packages/database/src/migrate.ts`)

`runMigrations()` previously had no protection against two callers
racing on the `_migrations` table and the DDL itself — a genuine gap: two
application instances starting simultaneously against a freshly
provisioned database (the exact scenario a real deployment's rolling
restart or multi-replica startup produces) could both read an empty
`_migrations` table, both attempt to apply the same file, and one loses
a duplicate-object race or, worse, a torn partial apply. Fixed with a
Postgres session-level advisory lock (`pg_advisory_lock`/`pg_advisory_unlock`
on a dedicated connection held for the whole migration run, not
`pool.query()`'s per-call connection borrowing, since advisory locks are
session-scoped) — a blocked caller now waits for the lock rather than
racing, and the lock releases even if migration fails.

### 3. Readiness endpoint (`apps/api`)

`GET /v1/ready` is new, distinct from the pre-existing `GET /v1/health`.
`/v1/health` is pure liveness (process is up, never touches the
database — stays healthy during a database outage an orchestrator
cannot fix by restarting the process). `/v1/ready` performs a real
`SELECT 1` against the pool: 200 with pool utilization stats if the
database is reachable, 503 if not — the standard liveness/readiness
split an orchestrator (Kubernetes, ECS, etc.) needs to correctly decide
"restart this instance" vs. "stop routing traffic to it but leave it
running."

### 4. Backup, restore, retention, and tenant export (`infrastructure/database/scripts/`)

Eight new shell scripts, each independently runnable, parameterized via
environment variables, and — critically — each one **actually executed
live against this repository's disposable local PostgreSQL 16 instance
during this build**, not merely written:

| Script | Purpose |
|---|---|
| `backup.sh` | Logical backup via `pg_dump -Fc` (custom format: compressed, selectively restorable). |
| `restore.sh` | Restores a `backup.sh` archive into a named target database; refuses to overwrite an existing database. |
| `prune-backups.sh` | Deletes backup files older than `BACKUP_RETENTION_DAYS` (default 30); `--dry-run` mode. |
| `export-tenant.sh` | Exports one tenant's full data footprint as a human-readable SQL dump, scoped by the exact same RLS mechanism every domain repository already relies on. |
| `enable-wal-archiving.sh` / `disable-wal-archiving.sh` | Turns continuous WAL archiving on/off (the PITR prerequisite) and restarts the cluster (`archive_mode` is not reloadable). |
| `pitr-base-backup.sh` | Physical base backup via `pg_basebackup`, the PITR starting point. |
| `pitr-restore.sh` | Replays archived WAL up to a `recovery_target_time` on a scratch instance — never against the live cluster. |

See `test-evidence-build22.md` for the full live-execution record,
including the genuine point-in-time recovery drill (WAL archiving
enabled, a base backup taken, two writes made with a recorded timestamp
between them, and an actual recovered instance verified to contain the
first write and correctly exclude the second).

### 5. Disaster recovery procedure and RPO/RTO targets

Documented in `operating-procedure-build22.md` (day-to-day use) and
`rollback-procedure-build22.md` (recovery scenarios), built directly on
the scripts above rather than as a separate, disconnected runbook.

## Architecture rules preserved

- No duplicate infrastructure — `export-tenant.sh` reuses the exact same
  `current_setting('app.tenant_id', true)` RLS mechanism every domain
  repository already depends on, discovering which tables are
  tenant-scoped dynamically from Postgres's own `pg_policies` catalog
  rather than hand-maintaining a second, parallel table list that could
  drift out of sync.
- Server-side enforcement only — `export-tenant.sh` refuses to run
  against a superuser/BYPASSRLS connection (a real safety guard, not
  just documentation — see `security-controls-build22.md`), since such a
  connection would silently bypass RLS and leak every tenant's data.
- Tenant/workspace/business fail-closed isolation — unchanged; this
  build adds no new authorization logic, only operational tooling around
  the existing data.
- No frozen migration was modified — this build added **zero**
  migrations (verified via `git status --porcelain` on
  `infrastructure/database/migrations/`); every deliverable is
  application code, configuration, or operational scripting.
- No later-build functionality — this build stops at
  connection-pooling/locking/readiness/backup/PITR/retention/export/DR
  procedure; it does not implement BUILD-23's deployment automation or
  BUILD-24's secrets management.

## Out of scope (explicitly not built)

See `known-limitations-build22.md` for the full list; the headline items
are: WAL archiving is not left permanently enabled on this repository's
shared disposable local test cluster (the drill enabled it, verified it
end to end, then restored the cluster to its prior baseline, to avoid
leaving an unbounded-growth archive directory as a side effect for every
future build's tests); the PITR drill was executed manually during this
build rather than wired into the automated `vitest run` regression
suite (it requires root privileges to modify cluster-wide configuration
and restart the shared test cluster, which would be disruptive if it ran
automatically alongside every other package's test suite); and no real
cloud-provider backup/replication service (e.g. RDS automated backups,
S3 offload) is configured, since this environment has no such provider
to configure against — the scripts are provider-agnostic and apply
unchanged to a real production PostgreSQL instance.
