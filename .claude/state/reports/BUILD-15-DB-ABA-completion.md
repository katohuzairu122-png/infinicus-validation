# BUILD-15 — Database Stage 2H Approved Business Action Persistence — Completion Report

**Build ID:** BUILD-15
**Layer:** DB-ABA
**Date:** 2026-07-22
**Branch:** `claude/infinicus-engine-debug-3loqb4`
**Specification:** `docs/implementation-queue/BUILD-15-DB-ABA-SPECIFICATION.md`
**Specification SHA-256:** `a7a22d7e9c9fa3fa84155d4edd48c69185354d91e9b53f798c9c0088db0bdc6d`
**Status:** COMPLETE

## What Was Built

The `approved_business_action` PostgreSQL schema (46 tables) persisting
Approved Business Action's governed approval authority: ADI→ABA intake,
action review packages, approval policies, approver authority and
delegation, approval decisions, approved actions, execution plans
(descriptive only), control gates (holds/releases), exceptions and
appeals, audit attestations/signatures, publication to Outcome Monitoring,
and a component registry with deployment history. This is the database
persistence tier only — no root browser ABA layer blocks, execution
runtime, or downstream Outcome Monitoring logic was touched.

## Migration Range

`0092_create_aba_schema_intake.sql` through
`0106_create_aba_triggers_events.sql` (15 files). Next free migration
after this build: `0107`.

## Frozen Migration Verification

`git diff --exit-code` against migrations `0001`–`0091` is clean — the
frozen range was not touched. Verified via direct `git diff` before and
after this build's changes.

## Schema Objects (live-verified)

| Object | Count |
|---|---|
| Tables | 46 |
| Indexes | 217 |
| RLS-enabled-and-forced tables | 46 / 46 |
| RLS policies | 46 |
| Functions | 15 |
| Triggers | 48 |

## Table Groups (all 12 required groups implemented)

A. Intake and lineage (4) · B. Review packages (4) · C. Approval policies
(4) · D. Approvers and authority (4) · E. Decisions (4) · F. Actions (4) ·
G. Execution plans (4) · H. Control gates (4) · I. Exceptions and appeals
(4) · J. Audit and signatures (4) · K. Publication (4) · L. Registry and
deployment (4). Total: 46 tables (spec-required groups all present).

## RLS

All 46 tables: `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`,
null-safe fail-closed predicate on `(tenant_id, workspace_id)`. Live-verified
missing-context read returns zero rows (`app_test_user`, no session
context set). Live-verified cross-tenant reads/writes rejected across 6
distinct tests in the integration suite.

## Append-Only Enforcement

45 evidence/history tables via shared `forbid_mutation()` trigger attached
through a dynamic `DO $$ FOREACH $$` loop. `approval_decision_versions` is
excluded (dedicated guard below — it is the only `_versions` table in this
schema carrying its own independent `status` column, confirmed via a
Python regex scan of all 46 table definitions). Append-only tables
live-tested for `UPDATE`/`DELETE` rejection in the integration suite.

## Lifecycle Guards

- `enforce_decision_immutability` / `enforce_decision_version_immutability`:
  decided decisions (`approved`, `approved_with_modifications`,
  `rejected`) reject any further status change. Live-verified via direct
  SQL `UPDATE` against both `approval_decisions` and
  `approval_decision_versions` post-decision.
- `enforce_publication_transition`: `draft → ready → dispatched →
  {acknowledged, rejected, revoked}`, `acknowledged → revoked`. Live-verified
  legal transitions succeed and an illegal transition throws
  `InvalidTransitionError`.

## Inbound Handoff

`adi-to-aba.ts` (v1.0.0, implemented in BUILD-14) re-verified against
every BUILD-15 §6 requirement — already fully compliant (tenant/workspace/
business ownership, correlation/causation, source reference, version/
status eligibility, evidence/lineage, idempotency, 512 KiB bound,
credential/dangerous-key rejection). **No changes made.** Its 31-test
contract suite remains passing unchanged.

## Outbound Handoff

`aba-to-om.ts` (v1.0.0) implemented in full, replacing the 6-line
placeholder. Carries an approved action package only, restricted to
`approved`/`approved_with_modifications` decisions and targeted
exclusively at `outcome_monitoring`. Enforces every §6 requirement plus
the authority boundary (see below). 32 contract tests, all passing.

## Events

10 required `aba.*` events, each with a dedicated SECURITY DEFINER
`emit_*` wrapper calling the shared `emit_outbox_event` helper.
`emit_data_published` rejects any target layer other than
`outcome_monitoring`. The canonical `aba.action.approved` event name from
CLAUDE.md §9 is reused (not superseded) as one of the 10 required events.
All 10 events live-tested for atomic outbox insertion.

## Repositories

13 repositories under
`packages/database/src/repositories/approved_action/` — one per table
group: `ABAIntakeRepository`, `ActionReviewRepository`,
`ApprovalPolicyRepository`, `ApproverAuthorityRepository`,
`ApprovalDecisionRepository`, `ApprovedActionRepository`,
`ActionExecutionPlanRepository`, `ActionControlGateRepository`,
`ApprovalExceptionRepository`, `ApprovalAppealRepository`,
`ABAAuditRepository`, `ABAPublicationRepository`,
`ABAComponentRegistryRepository` — plus `errors.ts` (26 controlled error
classes) and `index.ts`. Wired into `packages/database/src/index.ts`'s
root barrel with no type-name collisions against existing DA/BO/BI/DT/
SIM/ADI exports.

## Security

All repository writes use parameterized queries via `withTenantTransaction`.
No raw string interpolation into SQL. Controlled error classes (never raw
database errors) surfaced to callers. `aba-to-om.ts` rejects credential-like
keys, `__proto__`/`prototype`/`constructor` keys, non-plain objects,
unserializable values, and enforces a 512 KiB payload bound — mirroring the
`adi-to-aba.ts` / `sim-to-adi.ts` precedent exactly.

The "approval is distinct from execution" boundary is enforced at three
independent layers, each with a passing test:

1. **Schema documentation** — table/column comments on `approved_actions`
   and `approved_action_steps` ("never a record of execution"),
   `action_execution_plans` ("descriptive/planned only, never execution
   evidence"), and `aba_intake_packages`/`approval_decisions` ("no
   external business action may be executed by this database stage").
2. **Database trigger** — `enforce_decision_immutability` /
   `enforce_decision_version_immutability`: once decided, an approval
   decision can never be silently reopened or overwritten. Live-tested
   (direct SQL `UPDATE` against both header and version, both rejected
   with `/immutable/`).
3. **Handoff contract** — `validateABAToOMHandoff` rejects payloads
   containing `outcome`, `observedOutcome`, `outcomeRecord`, `verdict`,
   `evaluationResult`, `learningUpdate`, `learningRecord`,
   `executionResult`, `executedAt`, or `actionTaken`, and rejects any
   `decisionStatus` outside `READY_DECISION_STATUSES` — dedicated contract
   tests for each boundary category, all passing.

## Structural Tests

`packages/database/tests/migration-stage2h.test.ts` — **188 tests**, all
passing (minimum required: 150).

## Live Integration Tests

`packages/database/tests/aba-repositories.integration.test.ts` — **133
tests (132 passing, 1 skipped)**, all passing (minimum required: 120).
Covers all 13 repositories, schema/RLS posture, cross-tenant isolation (6
tests), outbox atomicity (11 tests), and transaction rollback (3 tests).

## Contract Tests

- Inbound (`adi-to-aba.contract.test.ts`): 31 tests, unchanged, passing
  (minimum required: 20).
- Outbound (`aba-to-om.contract.test.ts`): 32 tests, passing (minimum
  required: 20).

## Regression Results

| Gate | Result |
|---|---|
| `@infinicus/database` full suite (17 files) | 1998 passed / 5 skipped |
| `@infinicus/database` full suite, run twice consecutively | Identical: 1998 passed / 5 skipped both runs |
| `@infinicus/handoff-contracts` full suite | 160 passed (128 pre-BUILD-15 + 32 new) |
| Root browser regression (`.test.mjs`, 189 files) | 188 pass / 1 pre-existing failure — see Known Limitations |
| Full ADI browser regression (27 files) | 27/27 pass |
| Simulation adapter regression (`engine-v3-adapter.test.ts`) | 26/26 pass, unchanged |
| `pnpm lint` (21 packages) | 0 errors (5 pre-existing `no-console` warnings in `client.ts`/`migrate.ts`, unrelated to this build) |
| `pnpm typecheck` | 0 errors |
| `git diff --check` | clean |

## Empty-Database Install

Fresh database (`infinicus_test_empty`), migrations `0001`→`0106` applied
in one pass with zero errors. Verified 46 `approved_business_action`
tables present post-install (106/106 migrations registered). Database
dropped after verification.

## Migration Idempotency

Re-running `runMigrations()` against the already-migrated database: all
106 migrations reported `skip` (zero re-applications, zero errors).

## Outbox Atomicity

All 10 `aba.*` `emit_*` functions live-tested via direct SQL against the
admin connection: each inserts exactly one `pending` row into
`events.outbox_events` per call; `emit_data_published` verified to reject
an invalid target layer and accept `outcome_monitoring`.

## Transaction Rollback

Live-verified: (1) an application-level validation failure leaves zero
rows in the affected version table; (2) an out-of-band raw SQL insert
violating a database-level `CHECK` bound is rejected and leaves zero rows
(defense in depth); (3) duplicate intake idempotency keys against
different ADI source packages resolve as an application-level replay, not
a database error.

## Files Created

- 15 migrations: `0092`–`0106` (see Migration Range).
- 13 repository files + `errors.ts` + `index.ts` under
  `packages/database/src/repositories/approved_action/`.
- `packages/database/tests/migration-stage2h.test.ts`
- `packages/database/tests/aba-repositories.integration.test.ts`
- `packages/handoff-contracts/tests/aba-to-om.contract.test.ts`
- `infinicus-platform/docs/database-stage-2h-approved-business-action.md`

## Files Modified

- `packages/handoff-contracts/src/aba-to-om.ts` (6-line placeholder →
  full contract).
- `packages/database/src/index.ts` (ABA repository exports wired in).
- `packages/event-contracts/src/index.ts` (10 `aba.*` events added).

## Documentation

`infinicus-platform/docs/database-stage-2h-approved-business-action.md`
created — full schema, RLS, append-only, lifecycle-guard, handoff, event,
repository, and testing documentation, plus the authority-boundary
section.

## Out-of-Scope Confirmation

No browser platform assembly, later database stages (2I/2J), external
brokers, production deployment, frontend redesign, unrelated refactors, or
authority owned by another layer were touched. Outcome Monitoring
persistence was not implemented. The Simulation engine and its adapter
were not modified (confirmed by the unchanged 26/26
`engine-v3-adapter.test.ts` result).

## Known Limitations

- `platform/tests/01-file-existence.test.mjs` asserts (frozen from
  BUILD-10) that no migration beyond `0049` exists. This assertion has
  been stale since BUILD-12 first legitimately extended migrations past
  `0049`, and remains stale after Stage 2G (BUILD-14) and Stage 2H
  (BUILD-15) for the same reason. It is a pre-existing condition, not a
  regression introduced by this build, and correcting a frozen BUILD-10
  test file is out of this build's scope.
- The local disposable PostgreSQL instance backing this session's live
  tests persisted across a mid-session worker restart; data was
  re-verified intact post-restart (46 tables, 48 triggers, 15 functions,
  full test suite re-run identical) before completing this report. No
  credentials were re-provisioned or committed (matches the repository's
  standing security rule that these are local disposable test credentials
  only, never persisted to any file).

## Queue Transition

`BUILD-15: pending → ready → in_progress → completed`. `currentReadyBuild`
remains `null` — **BUILD-16 was not readied or started**, per explicit
instruction.

## Commit

`55fcec7` — "Add BUILD-15: Database Stage 2H (Approved Business Action)
persistence"

## Branch

`claude/infinicus-engine-debug-3loqb4`

## PR

#10 (tracking PR for this branch) — updated with this build's summary.

## Next Build

BUILD-16 (Database Stage 2I — Outcome Monitoring persistence) is **not**
readied. Per BUILD-15 specification §16, re-verify its preconditions
against its frozen specification and the current repository state before
marking it ready.
