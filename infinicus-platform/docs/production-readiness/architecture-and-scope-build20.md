# BUILD-20 — Customer Decision Workflows: Architecture and Scope

**Build:** BUILD-20 (WORKFLOW) · **Depends on:** BUILD-19 (completed) · **Status:** Complete

## Purpose

Deliver a usable, responsive, accessible UI that lets a human walk a
business through one decision cycle: select the business, review its
data, see BI evidence, see Digital Twin state, see Simulation execution
results, see the ADI recommendation, run an ABA review and record an
approve/reject decision, enter an outcome, and view decision history —
composing the already-built BI/DT/Simulation/ADI/ABA/OM persistence
layers (BUILD-09/12/13/14/15/16/17) without duplicating any of their
logic.

## Explicit scope decision made before coding (per spec §1.4/§4)

This build's spec requires a real UI, unlike every prior build in this
sequence. Root `CLAUDE.md` §4 gates Next.js behind "only if instructed
later" — no prior instruction existed. **The user was asked directly**
before any UI code was written, and explicitly chose Next.js. That
choice is treated as the instruction root `CLAUDE.md` requires, recorded
here for the record.

## What already existed (reused, not duplicated)

Every read this build performs, and every domain write it triggers,
goes through the already-shipped, already-tested repositories in
`packages/database/src/repositories/{bi,dt,simulation,adi,approved_action,om}/`.
This build added **six minimal, additive read methods** to those
repositories — no existing method's behavior changed, and no migration
was touched:

| Repository | New method | Table |
|---|---|---|
| `BusinessRepository` (onboarding domain) | `listForWorkspace(ctx)` | `platform.businesses` |
| `InsightPackageRepository` (BI) | `listForBusiness(ctx, businessId)` | `business_intelligence.insight_packages` |
| `SimulationRunRepository` (SIM) | `listForBusiness(ctx, businessId)` | `simulation.simulation_runs` |
| `DecisionCaseRepository` (ADI) | `listForBusiness(ctx, businessId)` | `ai_decision_intelligence.decision_cases` |
| `ActionReviewRepository` (ABA) | `listForBusiness(ctx, businessId)` | `approved_business_action.action_review_packages` |
| `OutcomeObservationRepository` (OM) | `listForBusiness(ctx, businessId)` | `outcome_monitoring.outcome_observations` |

Each new method mirrors the exact shape of that repository's existing
list methods (`withTenantTransaction`, ordered by recency) — none of
them required schema changes, since every one of these tables already
had a `business_id` column and an index on it from its original
persistence-stage build.

## What was built

### 1. `packages/workflow` (new package)

`DecisionWorkflowService` composes the six domains above:

- `listBusinesses(ctx)` — business selection.
- `getWorkflowView(ctx, businessId)` — one aggregate read: the business,
  its most recent BI evidence, its active DT instance(s) and latest
  published snapshot, its recent simulation runs and latest published
  result, its recent ADI decision cases and latest published
  recommendation, its recent ABA reviews and latest decided approval
  decision, and its recent outcome observations.
- `getDecisionHistory(ctx, businessId)` — each stage's full
  recency-ordered list.
- `createReview` / `submitApprovalDecision` — starts an ABA review
  package for an already-received ABA intake package and forwards a
  human approver's explicit approve/approve-with-modifications/reject
  choice to `ApprovalDecisionRepository`.
- `recordOutcome` — records an outcome observation (with measurements
  and evidence) against an already-tracked monitored action and
  finalizes it via `OutcomeObservationRepository.record`.

**Per AD-021** ("Platform orchestration does not create business
authority... must not make business decisions"), this service never
decides anything itself — the two write methods only forward a human's
explicit choice to the repository that already owns that decision's
persistence and immutability rules.

### 2. `apps/web` (Next.js 15, App Router)

- `app/businesses` — business selection (lists `platform.businesses` for
  the caller's workspace).
- `app/businesses/[businessId]/workflow` — the aggregate workflow view
  (data review, BI evidence, DT state, simulation execution, ADI
  recommendation) plus two forms wired to Server Actions: start an ABA
  review and record a decision, and record an outcome.
- `app/businesses/[businessId]/history` — per-stage decision history.
- Server Components fetch directly through `@infinicus/workflow`; the
  two writes are plain `'use server'` Server Actions
  (`app/businesses/[businessId]/workflow/actions.ts`) — no separate REST
  or GraphQL API layer was introduced (still no HTTP framework chosen
  for `apps/api`, same boundary as BUILD-18/19).

## Architecture rules preserved

- No duplicate infrastructure — every domain table, RLS policy, and
  write path this build touches already existed; this build is a read
  composition layer plus two forwarding writes.
- Server-side enforcement only — all reads and writes happen in Next.js
  Server Components/Server Actions (never in client-side JavaScript);
  the browser only ever receives rendered HTML and form actions.
- Tenant isolation is enforced by the same RLS policies every prior
  build already relies on; this build introduces no new policy.
- No migrations were modified or added — verified byte-identical
  (`git diff --exit-code` on `infrastructure/database/migrations/`).
- No later-build functionality (workflow *engine*, billing, etc.) — this
  build is the decision-workflow *UI and view composition*, not a
  general-purpose orchestration/automation engine.

## Out of scope (explicitly not built)

See `known-limitations-build20.md` for the full list; the headline items
are: no authentication/session UI (tenant context is passed via visible
query parameters, clearly labeled as a placeholder), no way to discover
"which ABA intake package / monitored action is pending" from within the
UI (the reviewer pastes the id in directly), and simulation/DT/ADI
records themselves are still produced by their own layers' pipelines —
this UI reviews and decides, it does not trigger a simulation run or
generate a recommendation.
