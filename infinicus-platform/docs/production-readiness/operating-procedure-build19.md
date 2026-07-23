# BUILD-19 — Tenant Onboarding: Operating Procedure

## Applying the migrations

Migrations `0138`–`0141` follow directly on BUILD-18's `0137` — apply
with the same runner used by every prior build:

```bash
cd infinicus-platform/packages/database
pnpm build
ADMIN_DATABASE_URL="postgresql://<admin-role>:<password>@<host>:5432/<db>" \
  node -e "
    const { createPool, closePool } = require('./dist/client.js');
    const { runMigrations } = require('./dist/migrate.js');
    (async () => {
      createPool({ connectionString: process.env.ADMIN_DATABASE_URL });
      await runMigrations();
      await closePool();
    })().catch(e => { console.error(e); process.exit(1); });
  "
```

Then apply the local grants documented in `configuration-build19.md` once
per database (not idempotent-by-migration, since grants are intentionally
outside the migration system in this repository).

## Running the onboarding wizard (application code path)

```ts
import { OnboardingService } from '@infinicus/onboarding';

const onboarding = new OnboardingService();

// Step 1 — creates the tenant and its first workspace.
const { tenant, workspace, progress, ctx } = await onboarding.beginOnboarding(userId, {
  tenantName: 'Acme Inc', tenantSlug: 'acme',
  workspaceName: 'Primary', workspaceSlug: 'acme-primary',
  planCode: 'trial', // optional
});

// Step 2 — registers the business, including industry selection.
const { business } = await onboarding.setBusiness(ctx, progress.id, {
  legalName: 'Acme Trading LLC', businessCode: 'acme-trading',
  industry: 'retail', legalStructure: 'llc', businessModel: 'b2c',
});

// Step 3 — activates the initiating user's membership and grants 'owner'.
const { membership } = await onboarding.assignOwner(ctx, progress.id);

// Step 4 — applies default tenant settings (merges with any overrides).
const { settings } = await onboarding.applyDefaultSettings(ctx, progress.id, {
  theme: 'dark', // optional override of the { theme: 'system', ... } defaults
});

// Step 5 — invites teammates (pass [] to skip this step entirely).
const { invitations } = await onboarding.inviteTeamMembers(ctx, progress.id, [
  'teammate@acme.example',
]);

// Step 6 — marks the wizard complete. Requires every prior step visited.
const completed = await onboarding.completeOnboarding(ctx, progress.id);
```

Every step call is safe to retry after a network error or a dropped
connection — each already-completed step returns its existing result
instead of erroring or duplicating side effects (see
`test-evidence-build19.md` for the exact idempotency tests).

## Resuming an abandoned session

```ts
const active = await onboarding.resumeOnboarding(userId);
if (active) {
  // active.currentStep tells the caller exactly which step to render next.
  // Reconstruct ctx from active.tenantId / active.workspaceId / userId.
}
```

This works even if the caller has lost all local state (e.g. a new
browser session) — the lookup is keyed by the authenticated user, not by
anything the client needs to have remembered.

## Abandoning an attempt

```ts
await onboarding.abandonOnboarding(ctx, progress.id);
// A subsequent beginOnboarding() call starts an entirely new tenant —
// abandoning does not delete the old tenant/workspace/business rows,
// it only marks that particular onboarding attempt terminal.
```

## Operational monitoring

Every step completion, the final completion, and abandonment emit an
outbox event (`onboarding.step.completed`, `onboarding.completed`,
`onboarding.abandoned`) into `events.outbox_events` via
`onboarding.emit_outbox_event()`, following the identical pattern used by
every domain schema since `data_acquisition.emit_outbox_event` (migration
`0022`). Query `onboarding.tenant_onboarding` directly (scoped to the
caller's tenant, or via `initiated_by` for the caller's own attempts) to
see current wizard state without needing to replay events.
