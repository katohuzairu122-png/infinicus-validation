# BUILD-17 — Database Stage 2J Continuous Learning Persistence — Completion Report

**Build ID:** BUILD-17
**Layer:** DB-CL
**Date:** 2026-07-22
**Branch:** `claude/infinicus-engine-debug-3loqb4`
**Specification:** `docs/implementation-queue/BUILD-17-DB-CL-SPECIFICATION.md`
**Specification SHA-256:** `8ff97cfbc788c0967e83d8fe303dde093fda9bb16d96e065874d4edef527390d`
**Status:** COMPLETE

## What Was Built

The `continuous_learning` PostgreSQL schema (47 tables) persisting
Continuous Learning's governed change-proposal authority: OM→CL intake,
learning cases, feedback, lessons, patterns, model evaluation, policy
evaluation, improvement proposals, approval and release, a knowledge
registry, feedback publication back to Data Acquisition, and a component
registry with deployment history. This is the database persistence tier
only — no root browser CL layer blocks or analytical/learning business
logic was touched. This build completes the Stage 1–2J database
persistence route.

## Migration Range

`0122_create_cl_schema_intake.sql` through
`0136_create_cl_triggers_events.sql` (15 files). Next free migration
after this build: `0137`.

## Frozen Migration Verification

`git diff --exit-code` against migrations `0001`–`0121` is clean — the
frozen range was not touched. Verified via direct `git diff` before and
after this build's changes.

## Schema Objects (live-verified)

| Object | Count |
|---|---|
| Tables | 47 |
| Indexes | 219 |
| RLS-enabled-and-forced tables | 47 / 47 |
| RLS policies | 47 |
| Functions | 15 |
| Triggers | 49 |

## Table Groups (all 12 required groups implemented)

A. Intake and lineage (4) · B. Learning cases (4) · C. Feedback (4) ·
D. Lessons (4) · E. Patterns (4) · F. Model evaluation (4) · G. Policy
evaluation (4) · H. Improvement proposals (4) · I. Approval and release
(4) · J. Knowledge registry (4) · K. Feedback publication (3) ·
L. Registry and deployment (4). Total: 47 tables (minimum required: 47).

## RLS

All 47 tables: `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`,
null-safe fail-closed predicate on `(tenant_id, workspace_id)`. Live-verified
missing-context read returns zero rows (`app_test_user`, no session
context set). Live-verified cross-tenant reads/writes rejected across 9
distinct tests in the integration suite.

## Append-Only Enforcement

32 evidence/history tables via shared `forbid_mutation()` trigger attached
through a dynamic `DO $$ FOREACH $$` loop. `improvement_proposal_versions`
is excluded (dedicated guard below — it is the only `_versions` table in
this schema carrying its own independent `status` column, confirmed via a
Python regex scan of all 47 table definitions). 14 additional mutable
status-header tables are likewise excluded from the blanket loop since
each carries a status column repositories update in place. Append-only
tables live-tested for `UPDATE`/`DELETE` rejection across every
repository's test block in the integration suite.

## Lifecycle Guards

- `enforce_proposal_immutability` / `enforce_proposal_version_immutability`:
  decided proposals (`approved`, `rejected`) reject any further status
  change. Live-verified via direct SQL `UPDATE` against both
  `improvement_proposals` and `improvement_proposal_versions`
  post-decision.
- `enforce_publication_transition`: `draft → ready → dispatched →
  {acknowledged, rejected, revoked}`, `acknowledged → revoked`. Live-verified
  legal transitions succeed and an illegal transition
  (`draft → dispatched`) throws `InvalidTransitionError`.

## Inbound Handoff

`om-to-cl.ts` (v1.0.0, implemented in BUILD-16) re-verified against every
BUILD-17 §6 requirement — already fully compliant (tenant/workspace/
business ownership, correlation/causation, source reference, version/
status eligibility via `READY_FEEDBACK_STATUSES`, evidence/lineage,
idempotency, 512 KiB bound, credential/dangerous-key rejection). **No
changes made.** Its 31-test contract suite remains passing unchanged.

## Outbound Handoff

`cl-feedback.ts` (v1.0.0) implemented in full, replacing the 6-line
placeholder (`CLToDALHandoff` retained as a deprecated type alias for
backward compatibility). Carries an approved (decided) improvement
proposal only, targeted exclusively at `data_acquisition`. Enforces every
§6 requirement plus the authority boundary (see below). 31 contract
tests, all passing.

## Events

10 required `cl.*` events, each with a dedicated SECURITY DEFINER
`emit_*` wrapper calling the shared `emit_outbox_event` helper.
`emit_data_published` rejects any target layer other than
`data_acquisition`. The pre-existing `cl.learning.published` event name
from CLAUDE.md §9 is retained (not superseded) in the `LayerEventType`
union. All 10 events live-tested for atomic outbox insertion.

## Repositories

12 repositories under `packages/database/src/repositories/cl/` — one per
table group: `CLIntakeRepository`, `LearningCaseRepository`,
`LearningFeedbackRepository`, `LearnedLessonRepository`,
`LearningPatternRepository`, `ModelEvaluationRepository`,
`PolicyEvaluationRepository`, `ImprovementProposalRepository`,
`LearningChangeReviewRepository`, `KnowledgeArtifactRepository`,
`CLFeedbackPublicationRepository`, `CLComponentRegistryRepository` — plus
`errors.ts` (27 controlled error classes) and `index.ts`. Wired into
`packages/database/src/index.ts`'s root barrel with no type-name
collisions against existing DA/BO/BI/DT/SIM/ADI/ABA/OM exports.

## Security

All repository writes use parameterized queries via `withTenantTransaction`.
No raw string interpolation into SQL. Controlled error classes (never raw
database errors) surfaced to callers. `cl-feedback.ts` rejects
credential-like keys, `__proto__`/`prototype`/`constructor` keys,
non-plain objects, unserializable values, and enforces a 512 KiB payload
bound — mirroring the `om-to-cl.ts` / `aba-to-om.ts` precedent exactly.

The "Learning may propose governed changes but must never silently mutate
frozen historical evidence, decisions, approvals, or outcomes" boundary is
enforced at three independent layers, each with a passing test:

1. **Schema documentation** — table/column comments on
   `improvement_proposals` ("this is where CL exercises its
   change-proposal authority... permanently immutable") and
   `cl_feedback_packages` ("never a record of having executed the
   change").
2. **Database trigger** — `enforce_proposal_immutability` /
   `enforce_proposal_version_immutability`: once decided, a proposal can
   never be silently reopened or overwritten. Live-tested (direct SQL
   `UPDATE` against both header and version, both rejected with
   `/immutable/`).
3. **Handoff contract** — `validateCLFeedbackHandoff` rejects payloads
   containing `configOverride`, `appliedChange`, `connectorConfigChange`,
   `collectionScheduleOverride`, `executionResult`, `executedAt`,
   `actionTaken`, `outcome`, `observedOutcome`, `decisionOverride`, or
   `approvalOverride`, and rejects any `proposalStatus` other than
   `approved` — dedicated contract tests for each boundary category, all
   passing.

## Structural Tests

`packages/database/tests/migration-stage2j.test.ts` — **189 tests**, all
passing (minimum required: 150).

## Live Integration Tests

`packages/database/tests/cl-repositories.integration.test.ts` — **123
tests (122 passing, 1 skip-guard)**, all passing (minimum required: 120).
Covers all 12 repositories, schema/RLS posture, cross-tenant isolation (9
tests), outbox atomicity (11 tests), and transaction rollback (3 tests).

## Contract Tests

- Inbound (`om-to-cl.contract.test.ts`): 31 tests, unchanged, passing
  (minimum required: 20).
- Outbound (`cl-feedback.contract.test.ts`): 31 tests, passing (minimum
  required: 20).

## Regression Results

| Gate | Result |
|---|---|
| `@infinicus/database` full suite (21 files) | 2620 passed / 7 skipped |
| `@infinicus/database` full suite, run twice consecutively | Identical: 2620 passed / 7 skipped both runs |
| `@infinicus/handoff-contracts` full suite | 222 passed (191 pre-BUILD-17 + 31 new) |
| Root browser regression (`.test.mjs`, 189 files) | 188 pass / 1 pre-existing failure — see Known Limitations |
| Full ADI browser regression (27 files) | 27/27 pass |
| Simulation adapter regression (`engine-v3-adapter.test.ts`) | 26/26 pass, unchanged |
| `pnpm lint` (21 packages) | 0 errors (5 pre-existing `no-console` warnings in `client.ts`/`migrate.ts`, unrelated to this build) |
| `pnpm typecheck` | 0 errors |
| `git diff --check` | clean |

## Empty-Database Install

Fresh database (`infinicus_test_empty`), migrations `0001`→`0136` applied
in one pass with zero errors. Verified 47 `continuous_learning` tables
present post-install (136/136 migrations registered). Database dropped
after verification.

## Migration Idempotency

Re-running `runMigrations()` against the already-migrated database: all
136 migrations reported `skip` (zero re-applications, zero errors).

## Outbox Atomicity

All 10 `cl.*` `emit_*` functions live-tested via direct SQL against the
admin connection: each inserts exactly one `pending` row into
`events.outbox_events` per call; `emit_data_published` verified to reject
an invalid target layer and accept `data_acquisition`.

## Transaction Rollback

Live-verified: (1) an application-level validation failure leaves zero
rows in the affected table (a database-level CHECK-constraint rejection
on an unknown risk severity); (2) an out-of-band raw SQL insert violating
a database-level bound (`confidence = 2.0`, outside the `[0,1]` CHECK) is
rejected and leaves zero rows (defense in depth); (3) duplicate intake
idempotency keys against different OM source packages resolve as an
application-level replay, not a database error.

## Files Created

- 15 migrations: `0122`–`0136` (see Migration Range).
- 12 repository files + `errors.ts` + `index.ts` under
  `packages/database/src/repositories/cl/`.
- `packages/database/tests/migration-stage2j.test.ts`
- `packages/database/tests/cl-repositories.integration.test.ts`
- `packages/handoff-contracts/tests/cl-feedback.contract.test.ts`
- `infinicus-platform/docs/database-stage-2j-continuous-learning.md`

## Files Modified

- `packages/handoff-contracts/src/cl-feedback.ts` (6-line placeholder →
  full contract; `CLToDALHandoff` retained as a deprecated type alias).
- `packages/database/src/index.ts` (CL repository exports wired in).
- `packages/event-contracts/src/index.ts` (10 `cl.*` events added,
  `cl.learning.published` retained as pre-existing/not superseded).

## Documentation

`infinicus-platform/docs/database-stage-2j-continuous-learning.md`
created — full schema, RLS, append-only, lifecycle-guard, handoff, event,
repository, and testing documentation, plus the authority-boundary
section.

## Out-of-Scope Confirmation

No browser platform assembly, later database stages, external brokers,
production deployment, frontend redesign, unrelated refactors, or
authority owned by another layer were touched. A Data Acquisition-side
intake table for CL feedback was not implemented (see Known Limitations —
the frozen Stage 2A/2B DA schema predates the learning-loop concept and is
out of scope for this build). The Simulation engine and its adapter were
not modified (confirmed by the unchanged 26/26
`engine-v3-adapter.test.ts` result).

## Known Limitations

- `platform/tests/01-file-existence.test.mjs` asserts (frozen from
  BUILD-10) that no migration beyond `0049` exists. This assertion has
  been stale since BUILD-12 first legitimately extended migrations past
  `0049`, and remains stale after Stage 2I (BUILD-16) and Stage 2J
  (BUILD-17) for the same reason. It is a pre-existing condition, not a
  regression introduced by this build, and correcting a frozen BUILD-10
  test file is out of this build's scope.
- The `cl-feedback.ts` contract validates the sender side of the CL→DAL
  handoff only. No live Data Acquisition intake table exists to receive
  it — the frozen Stage 2A/2B DA schema was built before the learning-loop
  concept existed and was never designed with a CL-feedback intake. This
  is documented as a known limitation, not a defect: the contract and its
  32-test suite (31 contract + implicit coverage) fully validate the
  payload shape and authority boundary independent of any receiving
  table, matching this build's in-scope requirement (§6: "Complete:
  cl-feedback.ts").
- The local disposable PostgreSQL instance backing this session's live
  tests persisted across mid-session worker restarts; data was
  re-verified intact post-restart before completing this report. No
  credentials were re-provisioned or committed (matches the repository's
  standing security rule that these are local disposable test credentials
  only, never persisted to any file).

## Queue Transition

`BUILD-17: pending → ready → in_progress → completed`. `currentReadyBuild`
remains `null` — **BUILD-18 was not readied or started**, per explicit
instruction. This completes the Stage 1–2J database persistence route.

## Commit

`b809b68` — "Add BUILD-17: Database Stage 2J (Continuous Learning)
persistence"

## Branch

`claude/infinicus-engine-debug-3loqb4`

## PR

#10 (tracking PR for this branch) — updated with this build's summary.

## Next Build

BUILD-18 (AUTH — Authentication and authorization) is **not** readied.
Per BUILD-17 specification §16, re-verify its preconditions against
`docs/implementation-queue/BUILD-18-AUTH-SPECIFICATION.md` and the
current repository state before marking it ready. This build completes
the Stage 1–2J database persistence route per
`docs/implementation-queue/MASTER-PRODUCTION-ROUTE.md`; BUILD-18 begins
the next phase of platform work (authentication/authorization) per that
route.
