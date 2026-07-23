# BUILD-20 — Customer Decision Workflows: Operating Procedure

## Running the app

```bash
cd infinicus-platform/apps/web
DATABASE_URL="postgresql://<app-role>:<password>@<host>:5432/<db>" pnpm dev
# or, for a production build:
DATABASE_URL="postgresql://<app-role>:<password>@<host>:5432/<db>" pnpm build && pnpm start
```

No migration step is required — this build added no new schema objects.

## Walking through a decision cycle (manual / UI path)

1. Visit `/businesses` (with `?tenantId=&workspaceId=&userId=` if not
   already carried by a link) and select a business.
2. The workflow page (`/businesses/{id}/workflow`) shows Data Review, BI
   Evidence, Digital Twin State, Simulation Execution, and the ADI
   Recommendation — all read-only, sourced from whatever the upstream
   layers have already published for that business.
3. To review and decide on a pending approval: expand "Start a review
   and record a decision" under ABA Review, paste in the ABA intake
   package id awaiting review (see Known Limitations — there is no
   in-UI discovery list for this yet), write a summary, choose
   Approve / Approve with modifications / Reject, and submit. This
   creates a review package, a decision, and records the human's choice
   — the page reloads showing the new decision status.
4. To record an outcome: expand "Record an outcome" under Outcome Entry,
   paste in the monitored action id, write a summary, and submit. This
   creates and immediately finalizes (`record()`) an outcome
   observation — once submitted it is permanently immutable
   (`OutcomeObservationImmutableError` on any further attempt against
   the same observation).
5. Visit `/businesses/{id}/history` for the full per-stage list of
   everything produced for that business so far.

## Composing the service directly (non-UI callers)

```ts
import { DecisionWorkflowService } from '@infinicus/workflow';

const workflow = new DecisionWorkflowService();
const businesses = await workflow.listBusinesses(ctx);
const view = await workflow.getWorkflowView(ctx, businessId);

const review = await workflow.createReview(ctx, businessId, {
  intakePackageId, reviewCode: 'review-001', summary: 'Ready for approval',
});
const decision = await workflow.submitApprovalDecision(ctx, businessId, {
  reviewPackageId: review.id, approverUserId: ctx.userId,
  assignmentCode: 'assign-001', decisionCode: 'dec-001',
  summary: 'Approving', outcome: 'approve',
});

const { observation } = await workflow.recordOutcome(ctx, businessId, {
  monitoredActionId, observationCode: 'obs-001',
  summary: 'Outcome recorded', effectiveAt: new Date(),
  measurements: [{ metricCode: 'revenue_delta', measuredValue: { amount: 5000 }, unit: 'usd' }],
  evidence: [{ evidenceType: 'manual_entry', evidenceReference: { source: 'analyst' } }],
});
```

## Operational monitoring

This build introduces no new events or outbox tables — every write it
triggers goes through the domain repository that already owns event
emission for that stage (e.g. `ApprovalDecisionRepository`'s
`approved_business_action` triggers, `OutcomeObservationRepository`'s
`outcome_monitoring` triggers). There is nothing workflow-specific to
monitor beyond what those domains already emit.

## Verifying the app renders and functions correctly

This was verified directly in a browser during this build (not merely
type-checked): `pnpm dev`, then navigated to `/businesses`,
`/businesses/{id}/workflow`, and `/businesses/{id}/history` with a real
fixture business seeded through the full BI→DT→SIM→ADI→ABA→OM pipeline;
clicked through from the business list to the workflow page; and
submitted the "Start a review and record a decision" form end-to-end
against a real ABA intake package, confirming the page reloaded showing
the resulting `approved` status.
