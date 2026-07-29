# BUILD-28 — Billing and Entitlements: Rollback Procedure

## What this build changes

- 4 new, additive migrations (`0150`–`0153`): a new `billing` schema (`plans`, `subscriptions`, `subscription_status_history`, `usage_records`), their indexes, RLS policies, and triggers/outbox functions. No existing schema, table, column, or migration modified.
- New packages: `packages/database/src/repositories/billing/*`, `packages/billing/*` (new top-level package).
- New `apps/api` files: `src/plugins/billing.ts`, `src/routes/billing.ts`, `src/schemas/billing.ts`. Modified: `src/app.ts` (plugin/route registration), `src/errors.ts` (new error-name-to-status-code entries), `src/routes/businesses.ts` (added `app.requireActiveSubscription()` to two existing routes' `preHandler` chains), `apps/api/package.json` (new `@infinicus/billing` dependency).
- New operational script: `infrastructure/deployment/scripts/billing-lifecycle-audit.cjs`.

## Rollback

```bash
git revert <this-build's-commit-sha>
```

**Migration rollback** (only needed if the new schema must also be removed from an already-migrated database — a plain code revert alone leaves the schema present but unused, which is safe):

```sql
BEGIN;
DROP SCHEMA billing CASCADE;
DELETE FROM _migrations WHERE filename IN (
  '0150_create_billing_schema.sql', '0151_create_billing_indexes.sql',
  '0152_create_billing_rls_policies.sql', '0153_create_billing_triggers_events.sql'
);
COMMIT;
```

## Effect of reverting `businesses.ts`'s `requireActiveSubscription()` wiring

Reverting removes the billing enforcement gate from the two write routes it was added to (`POST /v1/businesses/:id/decisions`, `POST /v1/businesses/:id/outcomes`) — those routes return to their pre-BUILD-28 behavior (permission-gated only, no subscription check). No other route or business logic is affected; the routes' actual handler code is unchanged, only their `preHandler` array.

## Verification after rollback

```bash
pnpm turbo run build lint typecheck
pnpm turbo run test --filter=@infinicus/database --filter=@infinicus/api
```

Confirms the reverted state builds and the pre-existing (BUILD-27-era) test suites still pass. If the migration rollback above was also applied, confirm `SELECT 1 FROM information_schema.schemata WHERE schema_name = 'billing'` returns zero rows.

## No data-loss risk from rollback

This build's own subscription/usage data has never been created against any real (non-test) tenant — every live test in this build's own drills used fixture tenants created and (where possible) erased within the same test run. Reverting carries no risk of destroying real billing state.
