# BUILD-22 — Production Database and Recovery: Rollback Procedure

## Database rollback

This build added **zero migrations** — no schema, table, column, or RLS
policy was created or modified. There is nothing to roll back at the
database level.

## Application-code rollback

`git revert <BUILD-22 implementation commit> <BUILD-22 report/queue commit>`

This removes/reverts:

- `infrastructure/database/scripts/` (all eight new scripts — purely
  additive, nothing else in the codebase depends on them).
- `packages/database/src/client.ts`'s new `createPool()` options and
  `poolStats()` export — all-optional additions with the same defaults
  as before; reverting restores the exact prior signature and behavior.
- `packages/database/src/migrate.ts`'s advisory-lock wrapper around
  `runMigrations()` — reverting restores the prior unprotected version
  (re-exposing the concurrent-migration race this build fixed; safe to
  revert only if you accept that regression, e.g. as a temporary measure
  while diagnosing an unrelated issue).
- `packages/configuration`'s five new `InfinicusConfig` pool-tuning
  fields — additive, with defaults; reverting is safe since
  `apps/api/src/server.ts` is the only caller that reads them (reverting
  both together restores the prior `createPool({ connectionString:
  config.databaseUrl })` call exactly).
- `apps/api/src/app.ts`'s new `GET /v1/ready` route — additive; reverting
  removes only that one route, `GET /v1/health` is unaffected.

No existing repository, service, migration, or route from any prior
build was modified by this build.

## Disaster-recovery rollback (undoing a live WAL-archiving/PITR drill, if repeated in production)

If `enable-wal-archiving.sh` was run against a real production cluster
and needs to be reversed (e.g. archive storage is being decommissioned):

```bash
./disable-wal-archiving.sh
```

This resets `archive_mode`/`archive_command` to their prior values via
`ALTER SYSTEM RESET` and restarts the cluster — exactly reversing
`enable-wal-archiving.sh`'s own changes, nothing else. **Caution:**
disabling WAL archiving means any PITR window depending on archived WAL
segments taken after this point no longer exists — only do this after
confirming a replacement recovery strategy (or that continuous
archiving is genuinely no longer required) is in place.

A `pitr-restore.sh` recovery instance is, by construction, never the
live cluster — there is nothing to "roll back" if a drill or a real
recovery attempt is abandoned; simply stop the scratch instance and
delete `RECOVERY_DATA_DIR`:

```bash
sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl stop -D "$RECOVERY_DATA_DIR"
rm -rf "$RECOVERY_DATA_DIR" "${RECOVERY_DATA_DIR}.log"
```

## Verifying a rollback

After an application-code rollback, confirm:

```bash
# scripts should no longer exist
test ! -d infrastructure/database/scripts && echo "scripts removed"

# GET /v1/ready should 404 (route no longer registered)
curl -s -o /dev/null -w '%{http_code}' localhost:3000/v1/ready   # expect 404

# createPool() signature reverted (no new options accepted)
```

and re-run the full `@infinicus/database` and `@infinicus/api` regression
suites to confirm no other domain was affected (this build touched no
existing repository, service, or route beyond the additions above).
