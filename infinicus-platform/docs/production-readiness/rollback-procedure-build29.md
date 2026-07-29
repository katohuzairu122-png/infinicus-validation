# BUILD-29 — Incident Response and Rollback: Rollback Procedure

## What this build changes

- 3 new, additive migrations (`0154`–`0156`): a new `platform.incidents`/`platform.incident_updates` schema, their indexes, and an `updated_at` trigger + append-only guard. No existing schema, table, column, or migration modified.
- New repository: `packages/database/src/repositories/incident/*`.
- New `apps/api` files: `src/routes/incidents.ts`, `src/schemas/incidents.ts`. Modified: `src/app.ts` (route registration), `src/errors.ts` (one new error-name-to-status-code entry).
- New documentation tree: `docs/incident-response/` (severity model, on-call ownership, 5 runbooks, communication templates, post-incident review template).

## Rollback

```bash
git revert <this-build's-commit-sha>
```

**Migration rollback** (only needed if the schema must also be removed from an already-migrated database):

```sql
BEGIN;
DROP TABLE platform.incident_updates;
DROP TABLE platform.incidents;
DROP FUNCTION IF EXISTS platform.forbid_incident_update_mutation();
DELETE FROM _migrations WHERE filename IN (
  '0154_create_incident_schema.sql', '0155_create_incident_indexes.sql', '0156_create_incident_triggers_events.sql'
);
COMMIT;
```

## Effect of reverting

Reverting removes the 6 `/v1/incidents*` HTTP routes entirely — no other route or business logic is affected (this build added routes and one new repository, it did not modify any existing write path's `preHandler` chain or handler logic, unlike BUILD-28's `requireActiveSubscription()` wiring into `businesses.ts`). The runbook/severity-model/communication-template documentation under `docs/incident-response/` has no runtime dependency on the code — it remains accurate reference material even if the tracking API is reverted, since every runbook step is written to work standalone (an incident can be handled by following the runbook even without `POST /v1/incidents` if that capability were ever rolled back).

## Verification after rollback

```bash
pnpm turbo run build lint typecheck
pnpm turbo run test --filter=@infinicus/database --filter=@infinicus/api
```

If the migration rollback above was also applied, confirm `SELECT to_regclass('platform.incidents')` returns `NULL`.

## No data-loss risk from rollback

No real (non-test) incident has been declared against this system — every live test in this build's own drills used ephemeral test data. Reverting carries no risk of destroying a real incident record or its timeline.
