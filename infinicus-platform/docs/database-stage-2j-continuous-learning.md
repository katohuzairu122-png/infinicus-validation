# Database Stage 2J — Continuous Learning Schema

## Status

**COMPLETE — VALIDATED — FROZEN** (2026-07-22)

Frozen migration range after Stage 2J: **0001–0136**

This is the final build in the Stage 1–2J database persistence route
(BI→DT→SIM→ADI→ABA→OM→CL), closing the platform's learning loop back to
Data Acquisition.

## Overview

Stage 2J creates the `continuous_learning` schema with 47 tables owning
Continuous Learning's governed change-proposal authority: validated
intake of Outcome Monitoring publication packages, learning cases,
feedback, lessons, patterns, model evaluation, policy evaluation,
improvement proposals, approval and release, a knowledge registry,
feedback publication back to Data Acquisition, and a component registry
with deployment history.

This is the database/repository persistence tier for Continuous
Learning — distinct from the root browser CL layer blocks
(`continuous-learning/INFINICUS-CL-*`, if/when populated), which remain
untouched. Stage 2J does not implement or alter CL's analytical/learning
business logic; it persists governed inputs, proposals, and lifecycle for
the database-backed platform track.

### Authority boundary (verbatim, load-bearing)

CL may: open a learning case from an accepted OM feedback intake; ingest
feedback and evidence; distill lessons and detect patterns; evaluate
models and policies; propose governed improvements with assessed impacts
and risks; route proposals through review, approval, release, and
rollback; register knowledge artifacts; publish an approved feedback
package to Data Acquisition.

CL must not: silently mutate frozen historical evidence, decisions,
approvals, or outcomes; directly apply a configuration change; execute a
change itself; record a data-acquisition outcome. Every change requires
versioning, evidence, review, approval, release, and rollback capability
with complete lineage.

This boundary is enforced at three layers: schema comments documenting the
constraint on `improvement_proposals` ("Learning may propose governed
changes but must never silently mutate frozen historical evidence,
decisions, approvals, or outcomes") and `cl_feedback_packages` ("never a
record of having executed the change"); the `improvement_proposals` /
`improvement_proposal_versions` immutable-once-decided guard (a proposal,
once approved or rejected, can never be silently reopened or overwritten);
and the `cl-feedback` handoff contract's explicit rejection of
`configOverride`, `appliedChange`, `connectorConfigChange`,
`collectionScheduleOverride`, `executionResult`, `outcome`, and related
fields.

## Migration Sequence

| File | Contents |
|------|----------|
| `0122_create_cl_schema_intake.sql` | `continuous_learning` schema + `cl_intake_packages`, `_versions`, `_source_references`, `_status_history` |
| `0123_create_cl_learning_cases.sql` | `learning_cases`, `_versions`, `_status_history`, `learning_case_evidence` |
| `0124_create_cl_feedback.sql` | `learning_feedback_records`, `_versions`, `_links`, `_quality` |
| `0125_create_cl_lessons.sql` | `learned_lessons`, `_versions`, `lesson_evidence`, `lesson_applicability` |
| `0126_create_cl_patterns.sql` | `learning_patterns`, `_versions`, `pattern_observations`, `pattern_confidence_scores` |
| `0127_create_cl_model_evaluation.sql` | `model_evaluation_runs`, `_results`, `model_drift_records`, `model_bias_records` |
| `0128_create_cl_policy_evaluation.sql` | `policy_evaluation_runs`, `_results`, `policy_change_proposals`, `policy_change_evidence` |
| `0129_create_cl_improvement_proposals.sql` | `improvement_proposals`, `improvement_proposal_versions`, `improvement_impacts`, `improvement_risks` |
| `0130_create_cl_approval_release.sql` | `learning_change_reviews`, `_decisions`, `_releases`, `_rollbacks` |
| `0131_create_cl_knowledge_registry.sql` | `knowledge_artifacts`, `_versions`, `knowledge_relationships`, `knowledge_supersessions` |
| `0132_create_cl_feedback_publication.sql` | `cl_feedback_packages`, `_versions`, `cl_feedback_events` |
| `0133_create_cl_registry.sql` | `cl_component_registry`, `_versions`, `cl_deployments`, `_rollbacks` |
| `0134_create_cl_indexes.sql` | 219 indexes across all 47 tables |
| `0135_create_cl_rls_policies.sql` | RLS enabled **and forced** on all 47 tables (null-safe tenant+workspace isolation) |
| `0136_create_cl_triggers_events.sql` | 14 `updated_at` triggers, append-only enforcement (32 tables), dedicated proposal-immutability + publication-transition guards, 10 SECURITY DEFINER outbox functions |

Frozen migrations 0001–0121 were not modified (confirmed via `git diff
--exit-code` clean against the committed baseline).

## Canonical Entity Integration (no duplication)

Stage 2J reuses `tenancy.tenants`, `tenancy.workspaces`, `platform.businesses`,
`identity.users`, `outcome_monitoring.om_publication_packages`, and
`approved_business_action.approval_policies`. No tenant/workspace/business
identity, user, OM-publication, or ABA-policy evidence table is
duplicated. `cl_intake_packages.om_publication_package_id` is a `NOT NULL`
FK to the canonical OM publication package; `policy_evaluation_runs.approval_policy_id`
is a nullable FK to the canonical ABA policy (nullable because CL may also
evaluate a candidate policy not yet adopted).

## Row-Level Security — Enabled and Forced

All 47 tables use both `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL
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

32 evidence/history tables reject `UPDATE` and `DELETE` unconditionally via
a shared `continuous_learning.forbid_mutation()` trigger function,
attached through a dynamic `DO $$ ... FOREACH t IN ARRAY ARRAY[...] $$`
loop rather than 32 hand-written `CREATE TRIGGER` statements.

`improvement_proposal_versions` is the **only** version table in this
schema excluded from the blanket list — it is the only `_versions` table
carrying its own independent `status` column (repositories update it in
place for the approve/reject transition), matching the
BUILD-12/13/14/15/16 established design pattern. Verified via a Python
regex scan of all 47 table definitions that no other `_versions` table
carries an independent status column. It instead receives the dedicated
`enforce_proposal_version_immutability` guard below. 14 additional
mutable-status header tables (`cl_intake_packages`, `learning_cases`,
`learning_feedback_records`, `learned_lessons`, `learning_patterns`,
`model_evaluation_runs`, `policy_evaluation_runs`, `policy_change_proposals`,
`improvement_proposals`, `learning_change_reviews`, `knowledge_artifacts`,
`cl_feedback_packages`, `cl_component_registry`, `cl_deployments`) are
likewise excluded from the blanket loop for the same reason each carries a
status column the repository updates in place.

## Lifecycle / Immutability Guards

- `enforce_proposal_immutability` (header `improvement_proposals`) and
  `enforce_proposal_version_immutability` (version
  `improvement_proposal_versions`): once `status` is `approved` or
  `rejected`, no further status change is permitted. Decided proposals are
  permanently immutable — this is the concrete database-level enforcement
  of "Learning may propose governed changes but must never silently
  mutate frozen historical evidence, decisions, approvals, or outcomes":
  a proposal cannot be silently reopened or overwritten once decided.
  Release and rollback are tracked as separate append-only audit entries
  in `learning_change_releases`/`learning_change_rollbacks` rather than by
  mutating the proposal's own status further.
- `enforce_publication_transition` (`cl_feedback_packages`): enforces the
  `draft → ready → dispatched → {acknowledged, rejected, revoked}`,
  `acknowledged → revoked` state machine — identical to the Stage
  2E/2F/2G/2H/2I publication-package lifecycle.

## Inbound Handoff — OM → CL

`packages/handoff-contracts/src/om-to-cl.ts` (v1.0.0, implemented in
BUILD-16) already satisfies every BUILD-17 §6 requirement: tenant/
workspace/business ownership, correlation/causation via the envelope,
source reference via the originating `om_publication_packages` id,
version/status eligibility via `READY_FEEDBACK_STATUSES` (`ready`),
evidence/lineage, idempotency, a 512 KiB payload bound, and credential-like
/ `__proto__`/`prototype`/`constructor` key rejection. **No changes were
required** — re-verified against the BUILD-17 specification and its
existing 31-test contract suite, which remains passing unchanged.

## Outbound Handoff — CL → DAL

`packages/handoff-contracts/src/cl-feedback.ts` (v1.0.0) implemented in
full, replacing the 6-line placeholder (previous export name
`CLToDALHandoff` retained as a deprecated type alias for backward
compatibility). It carries an approved improvement proposal only:
proposal/proposal-version identity, summary, distilled lessons, assessed
impacts, identified risks, and evidence references — restricted to
`approved`-status proposals (`READY_PROPOSAL_STATUSES`) and targeted
exclusively at `data_acquisition`, closing the platform's learning loop.

The contract enforces the authority boundary directly: it rejects
`proposalStatus !== 'approved'`, rejects `targetLayer !== 'data_acquisition'`,
and rejects a forbidden-field list covering a directly-applied
configuration change (`configOverride`, `appliedChange`,
`connectorConfigChange`, `collectionScheduleOverride`), an execution
result (`executionResult`, `executedAt`, `actionTaken`), a
data-acquisition outcome record (`outcome`, `observedOutcome`), and an
upstream decision/approval override (`decisionOverride`,
`approvalOverride`) — the concrete mechanism for "Learning may propose
governed changes but must never execute a change itself; Data Acquisition
holds sole authority over whether and how to act on the feedback."

## Events (10 required `cl.*`)

`cl.intake.received`, `cl.case.created`, `cl.lesson.created`,
`cl.pattern.detected`, `cl.model.drift_detected`, `cl.policy.evaluated`,
`cl.improvement.proposed`, `cl.change.approved`, `cl.feedback.published`,
`cl.data.published`.

Each has a dedicated `continuous_learning.emit_*` SECURITY DEFINER
wrapper function calling the shared `emit_outbox_event` helper, which
inserts into `events.outbox_events` atomically on the caller's
transaction client. `emit_data_published` rejects any `target_layer`
other than `data_acquisition`. The pre-existing `cl.learning.published`
event name from CLAUDE.md §9 is retained (not superseded) in the
`LayerEventType` union, matching the ABA/OM precedent.

## Repositories

`packages/database/src/repositories/cl/` — 12 repositories, one per table
group: `CLIntakeRepository`, `LearningCaseRepository`,
`LearningFeedbackRepository`, `LearnedLessonRepository`,
`LearningPatternRepository`, `ModelEvaluationRepository`,
`PolicyEvaluationRepository`, `ImprovementProposalRepository`,
`LearningChangeReviewRepository`, `KnowledgeArtifactRepository`,
`CLFeedbackPublicationRepository`, `CLComponentRegistryRepository` — plus
`errors.ts` (controlled error classes) and `index.ts` (barrel export).

## Testing

- `packages/database/tests/migration-stage2j.test.ts` — 189 structural
  tests (file existence, transactional wrapping, self-registration,
  per-table `CREATE TABLE` assertions, enum content, index/RLS/trigger
  counts, append-only-exclusion check, handoff-contract completeness
  checks, event-contracts union checks for all 10 `cl.*` events).
- `packages/database/tests/cl-repositories.integration.test.ts` — 123 live
  PostgreSQL tests (122 passing, 1 skip-guard): schema/RLS posture, all 12
  repositories (including direct-SQL rejection tests of the proposal
  immutability guards), cross-tenant isolation, all 10 outbox event
  functions plus invalid-target-layer rejection, transaction rollback.
- `packages/handoff-contracts/tests/cl-feedback.contract.test.ts` — 31
  contract tests.

## Known Limitations

- `platform/tests/01-file-existence.test.mjs` asserts (from BUILD-10) that
  no migration beyond `0049` exists — a frozen BUILD-10-era regression
  check that has been stale since BUILD-12 first added migrations past
  0049, and remains stale after Stage 2I and 2J for the same reason. This
  is a pre-existing condition unrelated to Stage 2J and out of this
  build's scope to correct.
- The `cl-feedback.ts` contract's outbound target, `data_acquisition`, has
  no live-database intake table awaiting it — the Data Acquisition
  persistence schema (Stage 2A/2B, frozen and out of scope for this
  build) predates the learning-loop concept and was never designed with a
  CL-feedback intake table. This build's scope is limited to the sender
  side of the handoff (validated by the contract and the live
  `emit_data_published` outbox event); implementing a receiving intake on
  the Data Acquisition side, if ever required, is future work outside
  Stage 2J.
