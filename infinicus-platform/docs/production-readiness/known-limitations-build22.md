# BUILD-22 — Production Database and Recovery: Known Limitations

## No scheduler — backup/prune/PITR-base-backup cadence is left to the deployment environment

This build delivers the scripts (`backup.sh`, `prune-backups.sh`,
`pitr-base-backup.sh`) but no cron job, CI schedule, or orchestrator
configuration to run them periodically. This matches root `CLAUDE.md`'s
own repository-structure boundary between `infrastructure/database/`
(database tooling, which this build populates) and
`infrastructure/deployment/` (deployment/scheduling configuration,
explicitly out of scope for a database-layer build) — wiring these
scripts into an actual schedule is a deployment-environment concern for
a later build or the operator's own CI/ops tooling, not something this
build's frozen scope covers.

## WAL archiving is not left permanently enabled on this repository's shared test cluster

`enable-wal-archiving.sh` was run, fully verified end to end (a real
PITR restore, confirmed correct via both direct data inspection and the
recovery log), then explicitly reversed via `disable-wal-archiving.sh`
before this build finished. This is deliberate, not an oversight:
leaving `archive_mode=on` permanently on this repository's shared,
disposable local test Postgres cluster (used by every package's test
suite across every build in this whole sequence) would mean every WAL
segment fill writes to `/var/lib/postgresql/wal_archive` indefinitely,
with no automatic pruning of *that* directory (only `backup.sh`'s
logical dumps have a retention script) — an unbounded-growth side
effect a future session would have to discover and clean up, for no
benefit to any test in this repository (none of them exercise PITR). In
a real production deployment, `archive_mode` should be left on
permanently, paired with its own WAL-archive retention policy (prune
archived WAL older than your PITR window) — not built here since there
is no real production cluster in this environment to hold that policy.

## The PITR drill is a manual, one-time-executed live verification, not part of the automated `vitest run` regression suite

Enabling WAL archiving requires root/superuser privileges to modify
cluster-wide `postgresql.conf` settings and restart the shared
PostgreSQL cluster every other package's test suite also depends on
being available and stable. Automating the full drill into `vitest run`
would mean every future `pnpm test` invocation restarts the shared
cluster and temporarily changes its configuration — directly risking
disruption to every other concurrently- or subsequently-running test
file, which is a materially worse trade than accepting that this one
capability's acceptance evidence is a documented, reproducible manual
procedure (`operating-procedure-build22.md`'s PITR section is exactly
the commands that were run) rather than a CI-gated automated test. The
scripts themselves (`enable-wal-archiving.sh`, `pitr-base-backup.sh`,
`pitr-restore.sh`, `disable-wal-archiving.sh`) are fully real,
independently runnable, and were the exact ones exercised during the
live drill — nothing about them is a stub or placeholder.

## No real cloud-provider backup/replication integration

`backup.sh` writes to a local filesystem path (`BACKUP_DIR`); there is
no S3/GCS/Azure Blob offload, no managed-service (RDS automated
backups, Cloud SQL backups) integration, and no streaming replica for
failover. This environment has no real cloud provider to configure
against, so building provider-specific integration would be
speculative, untestable code — out of scope per this build's own
"exact... before coding, no unresolved alternatives" requirement (spec
§4). The scripts are provider-agnostic: pointing `BACKUP_DIR` at a
mounted network volume, or piping `pg_dump`'s output to a cloud CLI
tool, applies without modification to a real deployment.

## `export-tenant.sh` does not export file/blob attachments

The `files` schema (`file_objects`, `file_versions`, etc.) is included
in the dynamically-discovered tenant-scoped table list (it has RLS
policies referencing `app.tenant_id` like every other domain), so file
**metadata** is exported — but the underlying file bytes themselves (if
stored outside PostgreSQL, e.g. in object storage) are not fetched or
bundled by this script. No prior build in this sequence has implemented
actual blob storage/retrieval (`files.file_objects` currently stores
only metadata and references), so there is nothing for this script to
fetch yet — this limitation will resolve automatically once a future
build implements real file storage, without needing changes to
`export-tenant.sh` itself.

## Connection-pool tuning defaults are conservative, not load-tested

`DB_POOL_MAX=10`, `DB_STATEMENT_TIMEOUT_MS=30000`, etc. are sensible
defaults carried over from (or close to) the pool's pre-existing
implicit values, not the result of load-testing this specific
application's real traffic patterns — no prior build in this sequence
has done production load testing (that is BUILD-27's stated scope,
Performance). These defaults are safe starting points, tunable via
environment variables without a code change once real traffic
characteristics are known.
