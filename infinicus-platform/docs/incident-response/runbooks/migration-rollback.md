# Runbook: Migration Rollback

**When to use:** a recently applied migration is itself the cause of an incident (a bad constraint, a bug in seed data, a lock that's blocking production traffic) and must be undone.

## This repository's migrations are forward-only, by design

Every migration since the project's foundation (`0001_foundation.sql` onward) is a plain, additive `BEGIN; ... INSERT INTO _migrations ...; COMMIT;` block with no companion "down" script — this is a deliberate, repository-wide convention (see every prior build's own rollback-procedure doc, e.g. rollback-procedure-build19.md/build22.md/build23.md/build26.md/build27.md/build28.md, all independently reaching the same conclusion). There is no `migrate down` command to run here.

## Steps

1. **Declare the incident** (Sev1/Sev2 almost always, given a schema-level problem in production): `POST /v1/incidents`.
2. **Assess: is a genuine schema rollback required, or is a forward-fix migration sufficient?** In the overwhelming majority of cases, the correct response is a new, small forward migration that corrects the problem (e.g. `DROP CONSTRAINT` + re-add a corrected one, or a data-fix `UPDATE`) — not reversing history. Post this assessment as a timeline update (`statusAtUpdate: "identified"`).
3. **If a forward-fix migration is the path** (the common case): write it following every other migration's own convention (freeze exact table/column names by inspecting the live schema first, wrap in `BEGIN`/`COMMIT`, `INSERT INTO _migrations`), run it through `infrastructure/deployment/scripts/migration-gate.sh` exactly as any other migration would be, and treat the resulting deployment like any other (see deployment-rollback.md if the accompanying application code must also roll back).
4. **If the migration genuinely must be reversed at the schema level** (e.g. a newly added table's very presence is causing a resource exhaustion or lock-contention incident and no forward-fix is fast enough): this requires a manual, reasoned `DROP`/`ALTER` written specifically for that migration's exact schema change, executed directly against the admin connection, followed immediately by:
   ```sql
   DELETE FROM _migrations WHERE filename = '<the migration's filename>';
   ```
   so a subsequent `migration-gate.sh` run does not skip re-applying it if the underlying problem is later fixed and the migration is wanted again. **This step has real data-loss risk if the table already holds rows other than what this incident introduced — confirm via `SELECT count(*)` before dropping anything, and prefer `pitr-restore.sh`/`restore.sh` (see restore-procedure.md) over a manual `DROP` whenever the table might hold data worth keeping.**
5. **Verify**: re-run `migration-gate.sh` against the target environment and confirm it reports either a clean `skip` (if reversed) or `apply`+`done` (if forward-fixed) with no error.
6. **Resolve the incident** with a postmortem link — every migration-rollback incident is at minimum Sev2 and warrants a full post-incident review (see post-incident-review-template.md), since a migration issue reaching production indicates a gap in this platform's own migration-gate/CI checks (BUILD-23) that should itself be reviewed.
