# Database Stage 2G — AI Decision Intelligence Schema

## Status

**COMPLETE — VALIDATED — FROZEN** (2026-07-22)

Frozen migration range after Stage 2G: **0001–0091**

## Overview

Stage 2G creates the `ai_decision_intelligence` schema with 47 tables owning
AI Decision Intelligence's governed reasoning evidence: validated intake of
Simulation publication packages, decision questions and cases, reasoning
runs, evidence, alternatives, recommendations, confidence and limitations,
policies and governance, monitoring requirements, publication onward to
Approved Business Action, and a component registry with deployment history.

This is the database/repository persistence tier for AI Decision
Intelligence — distinct from the root browser ADI layer blocks
(`ai-decision-intelligence/INFINICUS-ADI-*`), which remain untouched and
continue to own their own 27-file / 106-test regression suite. Stage 2G
does not implement or alter ADI reasoning logic; it persists governed
inputs, outputs, and lifecycle for the database-backed platform track.

### Authority boundary (verbatim, load-bearing)

ADI may: evaluate evidence; generate recommendations; calculate confidence;
identify risks; rank alternatives; publish a decision recommendation
package.

ADI must not: approve its own recommendation; execute actions; fabricate
Simulation evidence; modify downstream ABA state; record outcomes; create
learning updates.

This boundary is enforced at three layers: schema comments documenting the
constraint on every relevant table, the `decision_recommendations` /
`decision_recommendation_versions` immutable-once-published guard (a
recommendation, once published, can never be silently turned into an
approval), and the `adi-to-aba` handoff contract's explicit rejection of
`approval`, `executionResult`, `outcome`, and `learningUpdate` fields.

## Migration Sequence

| File | Contents |
|------|----------|
| `0077_create_adi_schema_intake.sql` | `ai_decision_intelligence` schema + `adi_intake_packages`, `_versions`, `_source_references`, `_status_history` |
| `0078_create_adi_decision_questions.sql` | `decision_questions`, `_versions`, `decision_objectives`, `decision_constraints` |
| `0079_create_adi_decision_cases.sql` | `decision_cases`, `_versions`, `_status_history`, `_inputs` |
| `0080_create_adi_reasoning_runs.sql` | `reasoning_requests`, `reasoning_runs`, `_steps`, `_status_history` |
| `0081_create_adi_decision_evidence.sql` | `decision_evidence`, `_versions`, `_links`, `_quality` |
| `0082_create_adi_decision_alternatives.sql` | `decision_alternatives`, `_versions`, `alternative_outcome_estimates`, `alternative_risk_profiles` |
| `0083_create_adi_decision_recommendations.sql` | `decision_recommendations`, `_versions`, `recommendation_rationales`, `recommendation_implementation_steps` |
| `0084_create_adi_confidence_limitations.sql` | `decision_confidence_scores`, `decision_uncertainties`, `decision_limitations`, `decision_assumptions` |
| `0085_create_adi_policies_governance.sql` | `decision_policies`, `_versions`, `decision_policy_evaluations`, `decision_guardrail_violations` |
| `0086_create_adi_monitoring_requirements.sql` | `decision_monitoring_requirements`, `decision_monitoring_metrics`, `decision_review_schedules` |
| `0087_create_adi_publication.sql` | `adi_insight_packages`, `_versions`, `adi_publication_packages`, `_events` |
| `0088_create_adi_registry.sql` | `adi_component_registry`, `_versions`, `adi_deployments`, `_rollbacks` |
| `0089_create_adi_indexes.sql` | 223 indexes across all 47 tables |
| `0090_create_adi_rls_policies.sql` | RLS enabled **and forced** on all 47 tables (null-safe tenant+workspace isolation) |
| `0091_create_adi_triggers_events.sql` | 14 `updated_at` triggers, append-only enforcement (31 tables), 3 lifecycle/immutability guards, 10 SECURITY DEFINER outbox functions |

Frozen migrations 0001–0076 were not modified (confirmed via `git diff`
clean against the committed baseline).

## Canonical Entity Integration (no duplication)

Stage 2G reuses `tenancy.tenants`, `tenancy.workspaces`, `platform.businesses`,
`identity.users`, and `simulation.simulation_publication_packages`. No
tenant/workspace/business identity, user, or simulation-evidence table is
duplicated. `adi_intake_packages.simulation_publication_package_id` is a
`NOT NULL` FK to the canonical Simulation publication package.

## Row-Level Security — Enabled and Forced

All 47 tables use both `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL
SECURITY`, with the Stage 2D/2E/2F null-safe fail-closed predicate:

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

31 evidence/history tables reject `UPDATE` and `DELETE` unconditionally via
a shared `ai_decision_intelligence.forbid_mutation()` trigger function,
attached through a dynamic `DO $$ ... FOREACH t IN ARRAY ARRAY[...] $$`
loop rather than 31 hand-written `CREATE TRIGGER` statements.

`decision_recommendation_versions` is the **only** version table in this
schema excluded from the blanket list — it is the only `_versions` table
carrying its own independent `status` column (repositories update it in
place for validate/publish transitions), matching the BUILD-12/13
established design fix. It instead receives the dedicated
`enforce_recommendation_version_immutability` guard below.

## Lifecycle / Immutability Guards

- `enforce_recommendation_immutability` (header `decision_recommendations`)
  and `enforce_recommendation_version_immutability` (version
  `decision_recommendation_versions`): once `status = 'published'`, no
  further status change is permitted. Published recommendations are
  permanently immutable — this is the concrete database-level enforcement
  of "ADI must not... modify [its own published recommendation]."
- `enforce_publication_transition` (`adi_publication_packages`): enforces
  the `draft → ready → dispatched → {acknowledged, rejected, revoked}`,
  `acknowledged → revoked` state machine — identical to the Stage 2E/2F
  publication-package lifecycle.

## Inbound Handoff — SIM → ADI

`packages/handoff-contracts/src/sim-to-adi.ts` (v1.1.0, extended in
BUILD-13) already satisfies every BUILD-14 §6 requirement: tenant/workspace/
business ownership, correlation/causation via the envelope, source
reference via `provenance.sourceResultRef`, version/status eligibility via
`run.status === 'completed'`, effective time via `run.completedAt`,
evidence/lineage via `provenance` + `lineage[]`, idempotency via
`idempotencyKey`, a 512 KiB payload bound, and credential-like /
`__proto__`/`prototype`/`constructor` key rejection. **No changes were
required** — re-verified against the BUILD-14 specification and its
existing 21-test contract suite, which remains passing unchanged.

## Outbound Handoff — ADI → ABA

`packages/handoff-contracts/src/adi-to-aba.ts` (v1.0.0, newly implemented in
BUILD-14) replaces the 6-line placeholder with a full strict versioned
`LayerHandoff<ADIToABAHandoffPayload>` contract. It carries a published
recommendation only: case/recommendation/version identity, summary,
rationales, implementation steps (descriptive only), confidence summary,
risks, evidence references, and the originating `adi_publication_packages`
id — targeted exclusively at `approved_business_action`.

The contract enforces the authority boundary directly: it rejects
`recommendationStatus !== 'published'`, rejects `targetLayer !==
'approved_business_action'`, and rejects a forbidden-field list covering
approval (`approval`, `approved`, `approvedBy`, `approvalStatus`),
execution (`executionResult`, `execute`, `executedAt`, `actionTaken`),
outcome (`outcome`, `observedOutcome`, `outcomeRecord`), and learning-update
(`learningUpdate`, `learningRecord`) content — the concrete mechanism for
"ADI-to-ABA must preserve this separation explicitly."

## Events (10 required `adi.*`)

`adi.intake.received`, `adi.reasoning.started`, `adi.reasoning.completed`,
`adi.reasoning.failed`, `adi.alternative.evaluated`,
`adi.recommendation.generated`, `adi.confidence.calculated`,
`adi.guardrail.violated`, `adi.decision.published`, `adi.data.published`.

Each has a dedicated `ai_decision_intelligence.emit_*` SECURITY DEFINER
wrapper function calling the shared `emit_outbox_event` helper, which
inserts into `events.outbox_events` atomically on the caller's transaction
client. `emit_data_published` rejects any `target_layer` other than
`approved_business_action`. The legacy `adi.decision.generated` event type
is retained in the `LayerEventType` union as superseded (documented inline)
rather than removed, matching the BI/DT/SIM precedent.

## Repositories

`packages/database/src/repositories/adi/` — 12 repositories, one per table
group: `ADIIntakeRepository`, `DecisionQuestionRepository`,
`DecisionCaseRepository`, `ReasoningRunRepository`,
`DecisionEvidenceRepository`, `DecisionAlternativeRepository`,
`DecisionRecommendationRepository`, `DecisionConfidenceRepository`,
`DecisionPolicyRepository`, `DecisionMonitoringRequirementRepository`,
`ADIPublicationRepository`, `ADIComponentRegistryRepository` — plus
`errors.ts` (controlled error classes) and `index.ts` (barrel export).

## Testing

- `packages/database/tests/migration-stage2g.test.ts` — 204 structural
  tests (file existence, transactional wrapping, self-registration,
  per-table `CREATE TABLE` assertions, enum content, index/RLS/trigger
  counts, append-only-exclusion check, handoff-contract completeness,
  event-contracts union checks).
- `packages/database/tests/adi-repositories.integration.test.ts` — 138 live
  PostgreSQL tests (schema/RLS posture, all 12 repositories, cross-tenant
  isolation, all 10 outbox event functions, transaction rollback).
- `packages/handoff-contracts/tests/adi-to-aba.contract.test.ts` — 31
  contract tests.

## Known Limitations

- `platform/tests/01-file-existence.test.mjs` asserts (from BUILD-10) that
  no migration beyond `0049` exists — a frozen BUILD-10-era regression
  check that has been stale since BUILD-12 first added migrations past
  0049, and remains stale after Stage 2F and 2G for the same reason. This
  is a pre-existing condition unrelated to Stage 2G and out of this
  build's scope to correct.
