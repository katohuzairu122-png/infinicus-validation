# BUILD-27 — Performance and Load Readiness: Rollback Procedure

## What this build changes

- Adds one new operational script (`infrastructure/deployment/scripts/load-test.mjs`) — not deployed with `apps/api`, no runtime dependency on it.
- Adds two new live test suites (`apps/api/tests/load-test.integration.test.ts`, `packages/database/tests/performance.integration.test.ts`) — test-only, no runtime effect.
- Modifies two existing operational scripts (`infrastructure/database/scripts/export-tenant.sh`, `infrastructure/database/scripts/delete-tenant-data.mjs`) to fix the workspace-scoping and append-only-table defects described in the other BUILD-27 docs.
- Modifies one existing test file (`packages/database/tests/export-tenant.integration.test.ts`) to add regression coverage for the workspace-scoping fix.
- Modifies one existing, unrelated test file (`apps/api/tests/api.integration.test.ts`) to fix a pre-existing test-fragility issue found during this build's regression run.

**No database migration is included.** No production API route, schema, or runtime application code changes.

## Rollback

```bash
git revert <this-build's-commit-sha>
```

Since there is no migration and no runtime code path affected, a plain revert is complete and safe — there is no "migration down" step, no data to restore, and no deployed service to redeploy differently (the two fixed scripts are invoked manually/operationally, not part of the running `apps/api` process).

## If the `export-tenant.sh` / `delete-tenant-data.mjs` fixes specifically need to be rolled back

Reverting this commit restores the pre-BUILD-27 behavior of both scripts: `app.tenant_id`-only scoping (silently incomplete for workspace-scoped tables) and `delete-tenant-data.mjs`'s all-or-nothing single transaction (which crashes outright on the first append-only table it encounters for a tenant with real audit-trail history, rather than degrading gracefully). Neither script has been invoked against any real (non-test) tenant data as part of this build — the fixes were developed and verified entirely against this build's own test fixtures and one long-lived internal test tenant, so reverting carries no risk of un-doing a real erasure or export that already happened.

## Verification after rollback

```bash
pnpm turbo run build lint typecheck
pnpm turbo run test --filter=@infinicus/database --filter=@infinicus/api
```

Confirms the reverted state builds and the pre-existing (BUILD-22/26-era) test suites still pass, restoring the exact state before this build.
