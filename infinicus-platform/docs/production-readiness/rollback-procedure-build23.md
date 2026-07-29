# BUILD-23 — Deployment and Environments: Rollback Procedure

## Database rollback

This build adds **one** migration (`0146_create_deployment_events.sql`)
— one new, platform-scoped table, no existing table/column/RLS policy
touched.

```sql
BEGIN;
DROP TRIGGER IF EXISTS trg_platform_deployment_events_updated_at ON platform.deployment_events;
DROP TABLE IF EXISTS platform.deployment_events;
DELETE FROM _migrations WHERE filename = '0146_create_deployment_events.sql';
COMMIT;
```

**Note:** `platform.deployment_events` holds only deployment-process
metadata — rolling it back cannot lose or orphan any tenant, workspace,
business, or domain record. The worst effect is losing the historical
record of past deployments (which environments ran which version, when)
— not a functional regression to the running application.

## Application-code rollback

This build introduced no schema changes to any pre-existing table, and
no existing repository, service, route, or script from any prior build
was modified — `infrastructure/deployment/scripts/`,
`apps/api/Dockerfile`, `.github/workflows/ci.yml`, and
`packages/database/src/repositories/deployment/` are all new. Rolling
back the application code is a plain revert:

```bash
git revert <BUILD-23 implementation commit> <BUILD-23 report/queue commit>
```

**One genuine cross-file change to be aware of**: `turbo.json`'s `test`
task gained `"env": ["DATABASE_URL", "ADMIN_DATABASE_URL"]`. Reverting
this specific line restores the prior (broken, but pre-existing)
behavior where `turbo run test` silently drops those env vars under
Turborepo's default strict env mode — every live-integration test's
`describe.runIf` guard would again evaluate to skip. This is a real
regression if reverted in isolation; if BUILD-23 is rolled back for an
unrelated reason, consider keeping this one line even while reverting
everything else, since it fixes a defect that predates this build's own
purpose and affects nothing this build owns.

## Rolling back a *deployed* application version (not the codebase)

This is the operational rollback scenario spec §2 actually means by
"rollback" — reverting a running environment to a previously-known-good
immutable version, not reverting source code:

```bash
# Identify the last known-good version for this environment:
psql "$DATABASE_URL" -c \
  "SELECT version, completed_at FROM platform.deployment_events
   WHERE environment = '<environment>' AND status = 'succeeded'
   ORDER BY started_at DESC LIMIT 5;"

# Re-promote that exact version (its immutable Docker image, tagged
# with that exact version string, already exists from when it was
# originally built — see architecture-and-scope-build23.md on
# immutable builds):
docker run -d --name infinicus-api \
  -e DATABASE_URL="<environment's DATABASE_URL>" \
  -p 3000:3000 \
  "infinicus-api:<previous-known-good-version>"

# Then gate and audit the rollback exactly like a forward deployment —
# deploy.sh's promotion gate applies identically, and since this
# version already has a succeeded deployment on record for this
# environment (it ran here before), the gate passes:
ENVIRONMENT="<environment>" \
DATABASE_URL="<admin-capable connection string>" \
BASE_URL="<environment's base URL>" \
DEPLOYED_BY="$(whoami)-rollback" \
  infrastructure/deployment/scripts/deploy.sh
```

The resulting `deployment_events` row records this as a normal
`succeeded` deployment of an older version — the audit trail shows
*what* is running now, which is what matters operationally; whether it
was a forward promotion or a rollback is visible from `notes`/
`deployed_by` and from comparing `version` against the environment's
prior history.

**Database migrations are never rolled back as part of an application
rollback** — this repository's migrations are forward-only (the same
convention established in every prior build's own rollback procedure,
e.g. BUILD-19's onboarding rollback). If the version being rolled back
*to* predates a migration the current schema has already applied, that
is a genuinely more serious incident requiring a reasoned, manual
decision (is the older application version even compatible with the
newer schema?) — not something `deploy.sh` or any script in this build
attempts to automate.

## Verifying a rollback

```sql
SELECT to_regclass('platform.deployment_events');  -- NULL after DB rollback
SELECT filename FROM _migrations WHERE filename = '0146_create_deployment_events.sql'; -- 0 rows
```

```bash
# scripts should no longer exist
test ! -d infrastructure/deployment/scripts && echo "deployment scripts removed"
test ! -f apps/api/Dockerfile && echo "Dockerfile removed"
```

and re-run the full `@infinicus/database` and `@infinicus/api` regression
suites to confirm no other domain was affected (this build touched no
existing repository, service, or route beyond the additions above).
