# BUILD-21 — Governed Application API: Rollback Procedure

## Database rollback

This build adds four migrations (`0142`–`0145`) that together create one
new schema (`api`) and one new table (`api.idempotency_keys`) — no
existing table, column, or RLS policy from any prior migration was
altered.

To roll back:

```sql
BEGIN;
DROP TRIGGER IF EXISTS set_updated_at_idempotency_keys ON api.idempotency_keys;
DROP TABLE IF EXISTS api.idempotency_keys;
DROP SCHEMA IF EXISTS api;
DELETE FROM _migrations WHERE filename IN (
  '0145_create_api_triggers.sql',
  '0144_create_api_rls_policies.sql',
  '0143_create_api_indexes.sql',
  '0142_create_api_schema.sql'
);
COMMIT;
```

**Note:** `api.idempotency_keys` is purely HTTP-layer bookkeeping — it
holds no business data. Rolling it back cannot lose or orphan any
tenant, workspace, business, or domain record; the worst effect is that
any in-flight idempotency claim is discarded (a subsequent retry of the
same client request would simply execute as a fresh, non-replayed
write).

## Application-code rollback

This build introduced no schema changes to any pre-existing table, and
no existing repository, service, or exported function from any prior
build (BI, DT, SIM, ADI, ABA, OM, CL, AUTH, onboarding, or workflow) was
modified — `apps/api`'s entire Fastify application, `packages/database`'s
`api/` repository directory, and the `packages/configuration`/
`packages/observability` rewrites are all this build's own code. Rolling
back the application code is a plain revert of this build's commits:

```bash
git revert <BUILD-21 implementation commit> <BUILD-21 report/queue commit>
```

This removes:
- `apps/api`'s entire Fastify application (routes, plugins, schemas,
  `app.ts`/`server.ts`) — reverting restores the prior placeholder
  `export {}` in `apps/api/src/index.ts`.
- `packages/database/src/repositories/api/` (`IdempotencyKeyRepository`,
  `IdempotencyConflictError`) and the corresponding barrel-export
  additions in `packages/database/src/index.ts` — purely additive;
  nothing outside this build's own new code imports them.
- `packages/configuration`'s real `loadConfig()` implementation,
  reverting to the prior `throw new Error('not yet implemented')` stub.
  **Caution:** nothing outside `apps/api` currently calls `loadConfig()`,
  so this revert is safe in isolation — but it does mean any *future*
  caller added after this build would need `loadConfig()` re-implemented
  before this rollback could be considered final.
- `packages/observability`'s pino-based logger implementation,
  reverting to the prior empty `export {}` placeholder. Same caution as
  above: safe today (only `apps/api` calls it), not safe to combine with
  a rollback if a later build has since taken a dependency on it.

## Verifying a rollback

After rollback, confirm:

```sql
SELECT to_regclass('api.idempotency_keys');  -- NULL
SELECT filename FROM _migrations WHERE filename LIKE '014%create_api%'; -- 0 rows
```

```bash
# apps/api should be back to its prior placeholder
grep -q "export {}" infinicus-platform/apps/api/src/index.ts && echo "index.ts reverted" || echo "STILL HAS buildApp EXPORT (rollback incomplete)"
```

and re-run the full `@infinicus/database` regression suite to confirm no
other domain was affected (it wasn't touched by this build's additive
repository, so this is a sanity check, not an expectation of change).
