# BUILD-22 — Production Database and Recovery: Operating Procedure

## Routine backups

```bash
cd infrastructure/database/scripts
DATABASE_URL="postgresql://<admin-role>:<pw>@<host>:5432/<db>" \
BACKUP_DIR="/var/backups/infinicus" \
  ./backup.sh
```

Schedule this on a cron/CI job at whatever interval your RPO target
requires (see "RPO/RTO targets" below). Must use a role with read access
to every schema — the least-privilege application role deliberately
cannot read bookkeeping tables like `_migrations`.

## Retention

```bash
BACKUP_DIR="/var/backups/infinicus" BACKUP_RETENTION_DAYS=30 \
  ./prune-backups.sh --dry-run   # review first
BACKUP_DIR="/var/backups/infinicus" BACKUP_RETENTION_DAYS=30 \
  ./prune-backups.sh             # then actually delete
```

Run on the same schedule as backups, after each backup completes.

## Restore testing (routine, not just for real incidents)

Periodically prove backups are actually restorable — a backup that has
never been restored is not a verified backup:

```bash
MAINTENANCE_DATABASE_URL="postgresql://<admin-role>:<pw>@<host>:5432/postgres" \
TARGET_DATABASE_URL="postgresql://<admin-role>:<pw>@<host>:5432/infinicus_restore_check" \
  ./restore.sh /var/backups/infinicus/infinicus-<db>-<timestamp>.dump
# verify row counts / spot-check data, then:
psql "$MAINTENANCE_DATABASE_URL" -c "DROP DATABASE infinicus_restore_check"
```

## Point-in-time recovery (PITR)

**Step 1 — enable WAL archiving** (one-time setup, requires a cluster
restart):

```bash
ARCHIVE_DIR="/var/lib/postgresql/wal_archive" ./enable-wal-archiving.sh
```

**Step 2 — take a base backup periodically** (e.g. daily):

```bash
BASE_BACKUP_DIR="/var/backups/infinicus-base/$(date -u +%Y%m%d)" \
  ./pitr-base-backup.sh
```

**Step 3 — recover to a specific moment** (real incident, or a routine
drill):

```bash
BASE_BACKUP_DIR="/var/backups/infinicus-base/20260723" \
ARCHIVE_DIR="/var/lib/postgresql/wal_archive" \
RECOVERY_DATA_DIR="/var/lib/postgresql/pitr_recovery" \
RECOVERY_PORT=5433 \
RECOVERY_TARGET_TIME="2026-07-23 14:00:00+00" \
  ./pitr-restore.sh
# inspect the recovered instance:
sudo -u postgres psql -p 5433 -h /tmp -d <dbname>
# when done:
sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl stop -D "$RECOVERY_DATA_DIR"
rm -rf "$RECOVERY_DATA_DIR" "${RECOVERY_DATA_DIR}.log"
```

`pitr-restore.sh` never touches the live cluster — it always creates a
fresh, separate instance on `RECOVERY_PORT`, so a PITR drill (or a real
recovery review) can run without any risk to production traffic.

## Tenant data export

```bash
DATABASE_URL="postgresql://<app-role>:<pw>@<host>:5432/<db>" \
TENANT_ID="<tenant-uuid>" \
OUTPUT_FILE="/tmp/tenant-export.sql" \
  ./export-tenant.sh
```

Must use the RLS-restricted application role, never an
admin/superuser/BYPASSRLS connection — `export-tenant.sh` checks this
itself and refuses to run otherwise (see `security-controls-build22.md`).

## Readiness / liveness (apps/api)

```bash
curl localhost:3000/v1/health   # liveness: process is up
curl localhost:3000/v1/ready    # readiness: process AND database are reachable
```

Point your orchestrator's liveness probe at `/v1/health` and its
readiness probe at `/v1/ready` — a database outage should stop traffic
routing to an instance (`/v1/ready` → 503) without triggering a restart
loop the orchestrator cannot fix (`/v1/health` stays 200).

## Migration locking

No operator action required — `runMigrations()` now serializes
concurrent invocations automatically via a Postgres advisory lock. A
second instance starting at the same moment as a first simply waits for
the lock rather than racing; both complete successfully once the first
finishes.

## RPO/RTO targets

Given the mechanisms delivered by this build, run on a schedule of:
**base backup daily, WAL archiving continuous, logical backup + prune
daily**:

- **RPO (Recovery Point Objective): a few minutes.** Continuous WAL
  archiving means the maximum data loss window in a true point-in-time
  recovery is bounded by how promptly the archive_command runs after a
  WAL segment fills (or `pg_switch_wal()` is called to force an early
  archive) — not by the daily base-backup cadence. The live drill in
  this build (see `test-evidence-build22.md`) forced a segment switch
  and observed the archived segment available within seconds.
- **RTO (Recovery Time Objective): minutes, dominated by base-backup
  restore time.** This build's own live drill measured: base backup
  copy (~229 MB test database) plus WAL replay to target time completed
  in well under a minute end to end. Production RTO scales with
  database size — the base-backup copy step is the dominant cost, not
  WAL replay (which only needs to replay the segments after the base
  backup, not the whole history).

These targets assume the operating cadence above is actually followed
(scheduled jobs, not manual/ad hoc) — see `known-limitations-build22.md`
for what this build does not automate (there is no built-in scheduler;
wiring these scripts into cron/CI is left to the deployment environment,
consistent with root `CLAUDE.md`'s repository-structure boundary between
application code and deployment configuration).
