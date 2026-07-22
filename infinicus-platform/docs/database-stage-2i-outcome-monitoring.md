# Database Stage 2I — Outcome Monitoring Schema

## Status

**COMPLETE — VALIDATED — FROZEN** (2026-07-22)

Frozen migration range after Stage 2I: **0001–0121**

## Overview

Stage 2I creates the `outcome_monitoring` schema with 45 tables owning
Outcome Monitoring's governed observation authority: validated intake of
ABA publication packages, monitoring plans, action tracking, outcome
observations, targets and thresholds, variance analysis, alerts and
incidents, attribution, reviews, learning feedback packages, publication
onward to Continuous Learning, and a component registry with deployment
history.

This is the database/repository persistence tier for Outcome Monitoring —
distinct from the root browser OM layer blocks
(`outcome-monitoring/INFINICUS-OM-*`, if/when populated), which remain
untouched. Stage 2I does not implement or alter OM's analytical/monitoring
business logic; it persists governed inputs, observations, and lifecycle
for the database-backed platform track.

### Authority boundary (verbatim, load-bearing)

OM may: observe an approved action's execution status; record outcome
observations with evidence and measurement quality; measure observations
against targets and thresholds; calculate variance and attribution
(with explicit uncertainty); raise alerts and open incidents; conduct
outcome reviews; publish a learning feedback package to Continuous
Learning.

OM must not: silently rewrite historical decisions; synthesize learning
updates; revise upstream decisions, recommendations, or approvals; modify
policy or models. Persist observed outcomes separately from expected
outcomes.

This boundary is enforced at three layers: schema comments documenting the
constraint on `outcome_observations`, `action_execution_observations`, and
`monitored_actions` ("never itself a record of having executed anything");
the `outcome_observations` / `outcome_observation_versions`
immutable-once-decided guard (an observation, once recorded, verified, or
disputed, can never be silently reopened or overwritten); and the
`om-to-cl` handoff contract's explicit rejection of `learningUpdate`,
`modelUpdate`, `policyUpdate`, `decisionOverride`, `recommendationOverride`,
`approvalOverride`, and execution-result fields.

## Migration Sequence

| File | Contents |
|------|----------|
| `0107_create_om_schema_intake.sql` | `outcome_monitoring` schema + `om_intake_packages`, `_versions`, `_source_references`, `_status_history` |
| `0108_create_om_monitoring_plans.sql` | `monitoring_plans`, `_versions`, `monitoring_plan_metrics`, `monitoring_plan_schedules` |
| `0109_create_om_action_tracking.sql` | `monitored_actions`, `_versions`, `_status_history`, `action_execution_observations` |
| `0110_create_om_outcome_observations.sql` | `outcome_observations`, `outcome_observation_versions`, `outcome_measurements`, `outcome_evidence` |
| `0111_create_om_targets_thresholds.sql` | `outcome_targets`, `_versions`, `outcome_thresholds`, `threshold_breaches` |
| `0112_create_om_variance.sql` | `outcome_variance_runs`, `_results`, `expected_actual_comparisons`, `variance_explanations` |
| `0113_create_om_alerts_incidents.sql` | `monitoring_alert_rules`, `_versions`, `monitoring_alerts`, `monitoring_incidents` |
| `0114_create_om_attribution.sql` | `outcome_attribution_runs`, `_factors`, `_results` |
| `0115_create_om_reviews.sql` | `outcome_reviews`, `_findings`, `_actions`, `_status_history` |
| `0116_create_om_feedback_packages.sql` | `learning_feedback_packages`, `_versions`, `learning_feedback_evidence` |
| `0117_create_om_publication.sql` | `om_publication_packages`, `_versions`, `om_publication_events` |
| `0118_create_om_registry.sql` | `om_component_registry`, `_versions`, `om_deployments`, `_rollbacks` |
| `0119_create_om_indexes.sql` | 215 indexes across all 45 tables |
| `0120_create_om_rls_policies.sql` | RLS enabled **and forced** on all 45 tables (null-safe tenant+workspace isolation) |
| `0121_create_om_triggers_events.sql` | 15 `updated_at` triggers, append-only enforcement (29 tables), dedicated observation-immutability + publication-transition guards, 10 SECURITY DEFINER outbox functions |

Frozen migrations 0001–0106 were not modified (confirmed via `git diff
--exit-code` clean against the committed baseline).

## Canonical Entity Integration (no duplication)

Stage 2I reuses `tenancy.tenants`, `tenancy.workspaces`, `platform.businesses`,
`identity.users`, `approved_business_action.aba_publication_packages`, and
`approved_business_action.approved_actions`. No tenant/workspace/business
identity, user, ABA-publication, or approved-action evidence table is
duplicated. `om_intake_packages.aba_publication_package_id` and
`monitored_actions.approved_action_id` are `NOT NULL` FKs to the canonical
ABA tables.

## Row-Level Security — Enabled and Forced

All 45 tables use both `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL
SECURITY`, with the established null-safe fail-closed predicate:

```sql
USING (
  tenant_id = current_setting('app.tenant_id', true)::uuid
  AND workspace_id = current_setting('app.workspace_id', true)::uuid
)
```

Missing session context resolves both settings to `NULL`, which never
equals any `uuid` value — reads and writes fail closed by default, even for
roles that would otherwise have table-level privileges. `BYPASSRLS` remains
reserved for the disposable `infinicus_test_admin` test role only.

## Append-Only Enforcement

29 evidence/history tables reject `UPDATE` and `DELETE` unconditionally via
a shared `outcome_monitoring.forbid_mutation()` trigger function, attached
through a dynamic `DO $$ ... FOREACH t IN ARRAY ARRAY[...] $$` loop rather
than 29 hand-written `CREATE TRIGGER` statements.

`outcome_observation_versions` is the **only** version table in this
schema excluded from the blanket list — it is the only `_versions` table
carrying its own independent `status` column (repositories update it in
place for the record/verify/dispute transition), matching the
BUILD-12/13/14/15 established design pattern. Verified via a Python regex
scan of all 45 table definitions that no other `_versions` table carries
an independent status column. It instead receives the dedicated
`enforce_observation_version_immutability` guard below. 16 additional
mutable-status header tables (`om_intake_packages`, `monitoring_plans`,
`monitored_actions`, `outcome_observations`, `outcome_targets`,
`outcome_variance_runs`, `monitoring_alert_rules`, `monitoring_alerts`,
`monitoring_incidents`, `outcome_attribution_runs`, `outcome_reviews`,
`learning_feedback_packages`, `om_publication_packages`,
`om_component_registry`, `om_deployments`, and
`outcome_observation_versions` itself) are likewise excluded from the
blanket loop for the same reason each carries a status column the
repository updates in place.

## Lifecycle / Immutability Guards

- `enforce_observation_immutability` (header `outcome_observations`) and
  `enforce_observation_version_immutability` (version
  `outcome_observation_versions`): once `status` is `recorded`, `verified`,
  or `disputed`, no further status change is permitted. Recorded
  observations are permanently immutable — this is the concrete
  database-level enforcement of "OM observes and evaluates; it does not
  silently rewrite historical decisions": an observation cannot be
  silently reopened or overwritten once decided.
- `enforce_publication_transition` (`om_publication_packages`): enforces
  the `draft → ready → dispatched → {acknowledged, rejected, revoked}`,
  `acknowledged → revoked` state machine — identical to the Stage
  2E/2F/2G/2H publication-package lifecycle.

## Inbound Handoff — ABA → OM

`packages/handoff-contracts/src/aba-to-om.ts` (v1.0.0, implemented in
BUILD-15) already satisfies every BUILD-16 §6 requirement: tenant/
workspace/business ownership, correlation/causation via the envelope,
source reference via the originating `aba_publication_packages` id,
version/status eligibility via `READY_DECISION_STATUSES` (`approved`,
`approved_with_modifications`), evidence/lineage, idempotency, a 512 KiB
payload bound, and credential-like / `__proto__`/`prototype`/`constructor`
key rejection. **No changes were required** — re-verified against the
BUILD-16 specification and its existing 32-test contract suite, which
remains passing unchanged.

## Outbound Handoff — OM → CL

`packages/handoff-contracts/src/om-to-cl.ts` (v1.0.0) implemented in full,
replacing the 6-line placeholder. It carries a finalized learning feedback
package only: observation/observation-version identity, feedback
package/version identity, summary, findings, review actions, variance
summary, and evidence references — restricted to `ready`-status feedback
packages (`READY_FEEDBACK_STATUSES`) and targeted exclusively at
`continuous_learning`.

The contract enforces the authority boundary directly: it rejects
`feedbackStatus !== 'ready'`, rejects `targetLayer !== 'continuous_learning'`,
and rejects a forbidden-field list covering a synthesized learning update
(`learningUpdate`, `learningRecord`), a policy/model revision
(`modelUpdate`, `policyUpdate`, `policyRevision`, `trainingUpdate`), an
upstream decision override (`decisionOverride`, `decisionRevision`,
`recommendationOverride`, `approvalOverride`), and execution-result
content (`executionResult`, `executedAt`, `actionTaken`) — the concrete
mechanism for "OM must not synthesize learning updates or revise upstream
decisions."

## Events (10 required `om.*`)

`om.intake.received`, `om.monitoring.started`, `om.observation.recorded`,
`om.target.breached`, `om.variance.calculated`, `om.alert.raised`,
`om.incident.opened`, `om.review.completed`, `om.feedback.published`,
`om.data.published`.

Each has a dedicated `outcome_monitoring.emit_*` SECURITY DEFINER wrapper
function calling the shared `emit_outbox_event` helper, which inserts into
`events.outbox_events` atomically on the caller's transaction client.
`emit_data_published` rejects any `target_layer` other than
`continuous_learning`. The pre-existing `om.outcome.evaluated` event name
from CLAUDE.md §9 is retained (not superseded) in the `LayerEventType`
union, matching the ABA/`aba.action.approved` precedent.

## Repositories

`packages/database/src/repositories/om/` — 13 repositories, one per table
group: `OMIntakeRepository`, `MonitoringPlanRepository`,
`MonitoredActionRepository`, `OutcomeObservationRepository`,
`OutcomeTargetRepository`, `OutcomeVarianceRepository`,
`MonitoringAlertRepository`, `MonitoringIncidentRepository`,
`OutcomeAttributionRepository`, `OutcomeReviewRepository`,
`LearningFeedbackPackageRepository`, `OMPublicationRepository`,
`OMComponentRegistryRepository` — plus `errors.ts` (controlled error
classes) and `index.ts` (barrel export).

## Testing

- `packages/database/tests/migration-stage2i.test.ts` — 190 structural
  tests (file existence, transactional wrapping, self-registration,
  per-table `CREATE TABLE` assertions, enum content, index/RLS/trigger
  counts, append-only-exclusion check, handoff-contract completeness
  checks, event-contracts union checks for all 10 `om.*` events).
- `packages/database/tests/om-repositories.integration.test.ts` — 122 live
  PostgreSQL tests (121 passing, 1 skip-guard): schema/RLS posture, all 13
  repositories (including direct-SQL rejection tests of the observation
  immutability guards), cross-tenant isolation, all 10 outbox event
  functions plus invalid-target-layer rejection, transaction rollback.
- `packages/handoff-contracts/tests/om-to-cl.contract.test.ts` — 31
  contract tests.

## Known Limitations

- `platform/tests/01-file-existence.test.mjs` asserts (from BUILD-10) that
  no migration beyond `0049` exists — a frozen BUILD-10-era regression
  check that has been stale since BUILD-12 first added migrations past
  0049, and remains stale after Stage 2H and 2I for the same reason. This
  is a pre-existing condition unrelated to Stage 2I and out of this
  build's scope to correct.
