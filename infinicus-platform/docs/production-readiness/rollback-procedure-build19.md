# BUILD-19 — Tenant Onboarding: Rollback Procedure

## Database rollback

This build adds four migrations (`0138`–`0141`) that together create one
new schema (`onboarding`) and one new table
(`onboarding.tenant_onboarding`) — no existing table, column, or RLS
policy from any prior migration was altered.

To roll back:

```sql
BEGIN;
DROP FUNCTION IF EXISTS onboarding.emit_onboarding_abandoned(uuid, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS onboarding.emit_onboarding_completed(uuid, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS onboarding.emit_step_completed(uuid, uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS onboarding.emit_outbox_event(uuid, uuid, text, text, uuid, uuid, jsonb, text, uuid);
DROP TABLE IF EXISTS onboarding.tenant_onboarding;
DROP SCHEMA IF EXISTS onboarding;
DELETE FROM _migrations WHERE filename IN (
  '0141_create_onboarding_triggers_events.sql',
  '0140_create_onboarding_rls_policies.sql',
  '0139_create_onboarding_indexes.sql',
  '0138_create_onboarding_schema.sql'
);
COMMIT;
```

**Caution:** any `tenancy.tenants`/`tenancy.workspaces`/`platform.businesses`
rows created *through* the onboarding flow are ordinary rows in those
frozen tables — they are **not** deleted by this rollback (nor should
they be; they are real tenant data, not onboarding-specific state). Only
the progress-tracking row referencing them is removed. If a full
rollback of onboarding-created tenants themselves is ever required, that
is a separate, much higher-risk operation outside this build's rollback
scope (deleting a tenant cascades through every layer's tenant-scoped
data).

## Application-code rollback

This build introduced no schema changes to any pre-existing table —
rolling back the application code is a plain revert of this build's
commits:

```bash
git revert <BUILD-19 implementation commit> <BUILD-19 report/queue commit>
```

No existing export, repository, or table from any prior build (BI, DT,
SIM, ADI, ABA, OM, CL, or AUTH) was modified by this build — `@infinicus/onboarding`
is a purely additive new package, and the `"require"` export-condition
fix pattern it reuses was already applied to `@infinicus/database`,
`@infinicus/authentication`, and `@infinicus/authorization` in BUILD-18,
not newly introduced here.

## Verifying a rollback

After rollback, confirm:

```sql
SELECT to_regclass('onboarding.tenant_onboarding');  -- NULL
SELECT filename FROM _migrations WHERE filename LIKE '013%onboarding%' OR filename LIKE '014%onboarding%'; -- 0 rows
```

and re-run the full `@infinicus/database` regression suite to confirm no
other domain was affected (it wasn't touched by this build, so this is a
sanity check, not an expectation of change).
