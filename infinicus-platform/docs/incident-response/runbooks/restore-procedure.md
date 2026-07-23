# Runbook: Database Restore

**When to use:** data loss or corruption (accidental delete, a bad migration's data-mutating side effect, application-level bug that wrote incorrect data broadly) requires restoring from backup — reuses BUILD-22's backup/restore/PITR tooling exactly, no new mechanism introduced by this build.

## Choosing a restore strategy

| Situation | Use |
|---|---|
| Restore to the most recent full backup, some data loss since then acceptable | `restore.sh` (full logical restore from `backup.sh`'s output) |
| Need to restore to a *specific point in time* (e.g. "right before the bad migration ran at 14:32") | `pitr-restore.sh` (point-in-time recovery via WAL replay) |
| Only one tenant's data needs to be recovered, not the whole database | Prefer `pitr-restore.sh` to a scratch instance, then extract just that tenant's rows — a full-database restore over production is a last resort for a single-tenant problem, not a first response |

## Steps

1. **Declare the incident** — data loss/corruption is Sev1 or Sev2 depending on scope (see severity-model.md).
2. **Stop the bleeding first**: if an ongoing process is actively causing more data loss/corruption (a runaway script, a bad migration still applying), stop it before starting any restore — restoring while the cause is still active wastes the restore.
3. **Post a timeline update** stating the chosen restore point/strategy and the expected data-loss window (e.g. "restoring to the 03:00 UTC backup; any writes between 03:00 and now will be lost unless PITR is used instead").
4. **Run the restore**:
   ```bash
   # Full restore from the latest (or a named) backup:
   MAINTENANCE_DATABASE_URL="postgresql://admin:pass@host:5432/postgres" \
   TARGET_DATABASE_URL="postgresql://admin:pass@host:5432/<restore-target-db>" \
     infrastructure/database/scripts/restore.sh /path/to/<backup-file>.dump

   # OR point-in-time recovery to an exact timestamp, into a separate recovery instance:
   BASE_BACKUP_DIR="/var/lib/postgresql/pitr_base" \
   ARCHIVE_DIR="/var/lib/postgresql/wal_archive" \
   RECOVERY_DATA_DIR="/var/lib/postgresql/pitr_recovery" \
   RECOVERY_PORT=5433 \
   RECOVERY_TARGET_TIME="<YYYY-MM-DD HH:MM:SS.ffffff+00>" \
     infrastructure/database/scripts/pitr-restore.sh
   ```
   `pitr-restore.sh` restores to a **separate recovery instance**, by construction (BUILD-22's own design — see rollback-procedure-build22.md's "a `pitr-restore.sh` recovery instance is, by construction, never the production instance itself" note) — verify the recovered data there before cutting production traffic over, never restore directly onto the live production instance in place.
5. **Verify the restored data** before cutting over: row counts for the affected table(s) match expectations, spot-check a few known records, confirm `migration-gate.sh` reports the expected set of applied migrations (a restore to an old backup may be missing recent migrations — apply them forward after restore, never skip this step).
6. **Cut over** (repoint `DATABASE_URL` to the recovered instance, or restore in place per `restore.sh`'s own documented procedure) and confirm `GET /v1/ready` returns healthy.
7. **Resolve the incident** with a postmortem link. Any incident requiring a restore is automatically Sev1/Sev2 and requires a full post-incident review (see post-incident-review-template.md) — root-causing how the data loss/corruption happened in the first place is at least as important as the recovery itself.

## RPO/RTO

See rollback-procedure-build22.md and the WAL-archiving/PITR live-drill evidence in test-evidence-build22.md for this platform's actual measured recovery-point/recovery-time characteristics — not re-derived here to avoid two documents disagreeing as the underlying numbers are re-measured over time.
