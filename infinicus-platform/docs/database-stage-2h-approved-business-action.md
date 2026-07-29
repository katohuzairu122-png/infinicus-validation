# Database Stage 2H — Approved Business Action Schema

## Status

**COMPLETE — VALIDATED — FROZEN** (2026-07-22)

Frozen migration range after Stage 2H: **0001–0106**

## Overview

Stage 2H creates the `approved_business_action` schema with 46 tables
owning Approved Business Action's governed approval authority: validated
intake of ADI publication packages, action review packages, approval
policies, approver authority and delegation, approval decisions, approved
actions, execution plans (descriptive only), control gates (holds/
releases), exceptions and appeals, audit attestations/signatures,
publication onward to Outcome Monitoring, and a component registry with
deployment history.

This is the database/repository persistence tier for Approved Business
Action — distinct from the root browser ABA layer blocks
(`approved-business-action/INFINICUS-ABA-*`, if/when populated), which
remain untouched. Stage 2H does not implement or alter ABA review/approval
business logic; it persists governed inputs, decisions, and lifecycle for
the database-backed platform track.

### Authority boundary (verbatim, load-bearing)

ABA may: receive a recommendation for review; evaluate it against policy;
assign and record approver authority; render an approval decision
(approved, approved with modifications, or rejected); document approved
actions, execution plans, and control gates; record exceptions and
appeals; publish an approved-and-ready-for-execution package to Outcome
Monitoring.

ABA must not: record outcomes; evaluate outcome success or failure; modify
downstream Outcome Monitoring or Continuous Learning state; create
learning updates. **No external business action may be executed by this
database stage** — `approved_action_steps` and
`action_execution_plans`/`action_execution_windows` are explicitly
descriptive/planned records, never execution records.

This boundary is enforced at three layers: schema comments documenting the
constraint on `approved_actions`, `approved_action_steps`, and
`action_execution_plans` ("never a record of execution"); the
`approval_decisions` / `approval_decision_versions` immutable-once-decided
guard (a decision, once approved, approved with modifications, or
rejected, can never be silently reopened); and the `aba-to-om` handoff
contract's explicit rejection of `outcome`, `observedOutcome`,
`outcomeRecord`, `verdict`, `evaluationResult`, `learningUpdate`,
`learningRecord`, `executionResult`, `executedAt`, and `actionTaken`
fields, plus its restriction to `approved`/`approved_with_modifications`
decisions only (rejected decisions are never published downstream).

## Migration Sequence

| File | Contents |
|------|----------|
| `0092_create_aba_schema_intake.sql` | `approved_business_action` schema + `aba_intake_packages`, `_versions`, `_source_references`, `_status_history` |
| `0093_create_aba_review_packages.sql` | `action_review_packages`, `_versions`, `action_review_notes`, `action_review_checklist_items` |
| `0094_create_aba_approval_policies.sql` | `approval_policies`, `_versions`, `approval_policy_evaluations`, `approval_policy_thresholds` |
| `0095_create_aba_approvers_authority.sql` | `approver_assignments`, `_versions`, `approval_delegations`, `approver_scopes` |
| `0096_create_aba_approval_decisions.sql` | `approval_decisions`, `approval_decision_versions`, `decision_conditions`, `decision_modifications` |
| `0097_create_aba_approved_actions.sql` | `approved_actions`, `_versions`, `approved_action_steps`, `action_scope_boundaries` |
| `0098_create_aba_execution_plans.sql` | `action_execution_plans`, `_versions`, `action_execution_windows`, `action_dependency_links` |
| `0099_create_aba_control_gates.sql` | `action_control_gates`, `action_holds`, `action_releases`, `gate_conditions` |
| `0100_create_aba_exceptions_appeals.sql` | `approval_exceptions`, `_versions`, `approval_appeals`, `approval_appeal_decisions` |
| `0101_create_aba_audit_signatures.sql` | `approval_attestations`, `approval_signatures`, `aba_audit_log`, `aba_audit_snapshots` |
| `0102_create_aba_publication.sql` | `aba_publication_packages`, `_versions`, `aba_publication_events`, `aba_publication_targets` |
| `0103_create_aba_registry.sql` | `aba_component_registry`, `_versions`, `aba_deployments`, `_rollbacks` |
| `0104_create_aba_indexes.sql` | 217 indexes across all 46 tables |
| `0105_create_aba_rls_policies.sql` | RLS enabled **and forced** on all 46 tables (null-safe tenant+workspace isolation) |
| `0106_create_aba_triggers_events.sql` | `updated_at` triggers, append-only enforcement (45 tables), dedicated decision-immutability + publication-transition guards, 10 SECURITY DEFINER outbox functions |

Frozen migrations 0001–0091 were not modified (confirmed via `git diff
--exit-code` clean against the committed baseline).

## Canonical Entity Integration (no duplication)

Stage 2H reuses `tenancy.tenants`, `tenancy.workspaces`, `platform.businesses`,
`identity.users`, and `ai_decision_intelligence.adi_publication_packages`. No
tenant/workspace/business identity, user, or ADI-recommendation-evidence
table is duplicated. `aba_intake_packages.adi_publication_package_id` is a
`NOT NULL` FK to the canonical ADI publication package.

`approval_policy_evaluations` (Group C) references
`action_review_package_versions` (Group B) rather than
`approval_decision_versions` (Group E, later in file order) — policies are
evaluated against the review package during review, before a decision
exists, which avoids a forward reference without reordering migration
files.

## Row-Level Security — Enabled and Forced

All 46 tables use both `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL
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

45 evidence/history tables reject `UPDATE` and `DELETE` unconditionally via
a shared `approved_business_action.forbid_mutation()` trigger function,
attached through a dynamic `DO $$ ... FOREACH t IN ARRAY ARRAY[...] $$`
loop rather than 45 hand-written `CREATE TRIGGER` statements.

`approval_decision_versions` is the **only** version table in this schema
excluded from the blanket list — it is the only `_versions` table carrying
its own independent `status` column (repositories update it in place for
the approve/approve-with-modifications/reject transition), matching the
BUILD-12/13/14 established design pattern. Verified via a Python regex
scan of all 46 table definitions that no other `_versions` table carries an
independent status column. It instead receives the dedicated
`enforce_decision_version_immutability` guard below.

## Lifecycle / Immutability Guards

- `enforce_decision_immutability` (header `approval_decisions`) and
  `enforce_decision_version_immutability` (version
  `approval_decision_versions`): once `status` is `approved`,
  `approved_with_modifications`, or `rejected`, no further status change is
  permitted. Decided decisions are permanently immutable — this is the
  concrete database-level enforcement of "approval is distinct from
  execution": a decision cannot be silently reopened or overwritten after
  it has been rendered.
- `enforce_publication_transition` (`aba_publication_packages`): enforces
  the `draft → ready → dispatched → {acknowledged, rejected, revoked}`,
  `acknowledged → revoked` state machine — identical to the Stage 2E/2F/2G
  publication-package lifecycle.

## Inbound Handoff — ADI → ABA

`packages/handoff-contracts/src/adi-to-aba.ts` (v1.0.0, implemented in
BUILD-14) already satisfies every BUILD-15 §6 requirement: tenant/
workspace/business ownership, correlation/causation via the envelope,
source reference via the originating `adi_publication_packages` id,
version/status eligibility via `recommendationStatus === 'published'`,
evidence/lineage, idempotency, a 512 KiB payload bound, and credential-like
/ `__proto__`/`prototype`/`constructor` key rejection. **No changes were
required** — re-verified against the BUILD-15 specification and its
existing 31-test contract suite, which remains passing unchanged.

## Outbound Handoff — ABA → OM

`packages/handoff-contracts/src/aba-to-om.ts` (v1.0.0, newly implemented in
BUILD-15) replaces the 6-line placeholder with a full strict versioned
`LayerHandoff<ABAToOMHandoffPayload>` contract. It carries an approved
action package only: decision/action identity, approval summary
(decision status, conditions, modifications), approved action detail,
execution plan reference (descriptive, not execution evidence), control
gate status, and the originating `aba_publication_packages` id — targeted
exclusively at `outcome_monitoring`.

The contract enforces the authority boundary directly: it rejects
`decisionStatus` outside `READY_DECISION_STATUSES` (`approved`,
`approved_with_modifications` — rejected decisions are never published
downstream), rejects `targetLayer !== 'outcome_monitoring'`, and rejects a
forbidden-field list covering outcome (`outcome`, `observedOutcome`,
`outcomeRecord`, `verdict`, `evaluationResult`), learning-update
(`learningUpdate`, `learningRecord`), and execution-result
(`executionResult`, `executedAt`, `actionTaken`) content — the concrete
mechanism for "no external business action may be executed by this
database stage."

## Events (10 required `aba.*`)

`aba.intake.received`, `aba.review.requested`, `aba.review.started`,
`aba.action.approved`, `aba.action.approved_with_modifications`,
`aba.action.rejected`, `aba.action.held`, `aba.action.released`,
`aba.action.published`, `aba.data.published`.

Each has a dedicated `approved_business_action.emit_*` SECURITY DEFINER
wrapper function calling the shared `emit_outbox_event` helper, which
inserts into `events.outbox_events` atomically on the caller's transaction
client. `emit_data_published` rejects any `target_layer` other than
`outcome_monitoring`. The canonical `aba.action.approved` event name from
CLAUDE.md §9 is reused (not superseded) as one of the 10 required events.

## Repositories

`packages/database/src/repositories/approved_action/` — 13 repositories,
one per table group: `ABAIntakeRepository`, `ActionReviewRepository`,
`ApprovalPolicyRepository`, `ApproverAuthorityRepository`,
`ApprovalDecisionRepository`, `ApprovedActionRepository`,
`ActionExecutionPlanRepository`, `ActionControlGateRepository`,
`ApprovalExceptionRepository`, `ApprovalAppealRepository`,
`ABAAuditRepository`, `ABAPublicationRepository`,
`ABAComponentRegistryRepository` — plus `errors.ts` (26 controlled error
classes) and `index.ts` (barrel export).

## Testing

- `packages/database/tests/migration-stage2h.test.ts` — 188 structural
  tests (file existence, transactional wrapping, self-registration,
  per-table `CREATE TABLE` assertions, enum content, index/RLS/trigger
  counts, append-only-exclusion check, handoff-contract completeness,
  event-contracts union checks).
- `packages/database/tests/aba-repositories.integration.test.ts` — 133 live
  PostgreSQL tests (132 passing, 1 skipped): schema/RLS posture, all 13
  repositories (including direct-SQL rejection tests of the decision
  immutability guards), cross-tenant isolation, all 10 outbox event
  functions plus invalid-target-layer rejection, transaction rollback.
- `packages/handoff-contracts/tests/aba-to-om.contract.test.ts` — 32
  contract tests.

## Known Limitations

- `platform/tests/01-file-existence.test.mjs` asserts (from BUILD-10) that
  no migration beyond `0049` exists — a frozen BUILD-10-era regression
  check that has been stale since BUILD-12 first added migrations past
  0049, and remains stale after Stage 2G and 2H for the same reason. This
  is a pre-existing condition unrelated to Stage 2H and out of this
  build's scope to correct.
