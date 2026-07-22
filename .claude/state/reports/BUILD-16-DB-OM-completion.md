# BUILD-16 — Database Stage 2I Outcome Monitoring Persistence — Completion Report

**Build ID:** BUILD-16
**Layer:** DB-OM
**Date:** 2026-07-22
**Branch:** `claude/infinicus-engine-debug-3loqb4`
**Specification:** `docs/implementation-queue/BUILD-16-DB-OM-SPECIFICATION.md`
**Specification SHA-256:** `7fe46451c9a52b2eee8fb337affdb3c0cd94c6242e268ca37b68a4b7d4449c30`
**Status:** COMPLETE

## What Was Built

The `outcome_monitoring` PostgreSQL schema (45 tables) persisting Outcome
Monitoring's governed observation authority: ABA→OM intake, monitoring
plans, action tracking, outcome observations, targets and thresholds,
variance analysis, alerts and incidents, attribution, reviews, learning
feedback packages, publication to Continuous Learning, and a component
registry with deployment history. This is the database persistence tier
only — no root browser OM layer blocks or analytical/monitoring business
logic was touched.

## Migration Range

`0107_create_om_schema_intake.sql` through
`0121_create_om_triggers_events.sql` (15 files). Next free migration
after this build: `0122`.

## Frozen Migration Verification

`git diff --exit-code` against migrations `0001`–`0106` is clean — the
frozen range was not touched. Verified via direct `git diff` before and
after this build's changes.

## Schema Objects (live-verified)

| Object | Count |
|---|---|
| Tables | 45 |
| Indexes | 215 (281 total including implicit PK/unique-constraint indexes) |
| RLS-enabled-and-forced tables | 45 / 45 |
| RLS policies | 45 |
| Functions | 15 |
| Triggers | 47 |

## Table Groups (all 12 required groups implemented)

A. Intake and lineage (4) · B. Monitoring plans (4) · C. Action tracking
(4) · D. Outcome observations (4) · E. Targets and thresholds (4) ·
F. Variance (4) · G. Alerts and incidents (4) · H. Attribution (3) ·
I. Reviews (4) · J. Feedback packages (3) · K. Publication (3) ·
L. Registry and deployment (4). Total: 45 tables (minimum required: 45).

## RLS

All 45 tables: `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`,
null-safe fail-closed predicate on `(tenant_id, workspace_id)`. Live-verified
missing-context read returns zero rows (`app_test_user`, no session
context set). Live-verified cross-tenant reads/writes rejected across 8
distinct tests in the integration suite.

## Append-Only Enforcement

29 evidence/history tables via shared `forbid_mutation()` trigger attached
through a dynamic `DO $$ FOREACH $$` loop. `outcome_observation_versions`
is excluded (dedicated guard below — it is the only `_versions` table in
this schema carrying its own independent `status` column, confirmed via a
Python regex scan of all 45 table definitions). 15 additional mutable
status-header tables (plans, actions, targets, run tables, alerts,
incidents, reviews, feedback packages, publication packages, registry,
deployments) are likewise excluded from the blanket loop since each
carries a status column repositories update in place. Append-only tables
live-tested for `UPDATE`/`DELETE` rejection across every repository's test
block in the integration suite.

## Lifecycle Guards

- `enforce_observation_immutability` / `enforce_observation_version_immutability`:
  decided observations (`recorded`, `verified`, `disputed`) reject any
  further status change. Live-verified via direct SQL `UPDATE` against
  both `outcome_observations` and `outcome_observation_versions`
  post-decision.
- `enforce_publication_transition`: `draft → ready → dispatched →
  {acknowledged, rejected, revoked}`, `acknowledged → revoked`. Live-verified
  legal transitions succeed and an illegal transition
  (`draft → dispatched`) throws `InvalidTransitionError`.

## Inbound Handoff

`aba-to-om.ts` (v1.0.0, implemented in BUILD-15) re-verified against
every BUILD-16 §6 requirement — already fully compliant (tenant/workspace/
business ownership, correlation/causation, source reference, version/
status eligibility via `READY_DECISION_STATUSES`, evidence/lineage,
idempotency, 512 KiB bound, credential/dangerous-key rejection). **No
changes made.** Its 32-test contract suite remains passing unchanged.

## Outbound Handoff

`om-to-cl.ts` (v1.0.0) implemented in full, replacing the 6-line
placeholder. Carries a finalized (`ready`-status) learning feedback
package only, targeted exclusively at `continuous_learning`. Enforces
every §6 requirement plus the authority boundary (see below). 31 contract
tests, all passing.

## Events

10 required `om.*` events, each with a dedicated SECURITY DEFINER
`emit_*` wrapper calling the shared `emit_outbox_event` helper.
`emit_data_published` rejects any target layer other than
`continuous_learning`. The pre-existing `om.outcome.evaluated` event name
from CLAUDE.md §9 is retained (not superseded) in the `LayerEventType`
union. All 10 events live-tested for atomic outbox insertion.

## Repositories

13 repositories under `packages/database/src/repositories/om/` — one per
table group: `OMIntakeRepository`, `MonitoringPlanRepository`,
`MonitoredActionRepository`, `OutcomeObservationRepository`,
`OutcomeTargetRepository`, `OutcomeVarianceRepository`,
`MonitoringAlertRepository`, `MonitoringIncidentRepository`,
`OutcomeAttributionRepository`, `OutcomeReviewRepository`,
`LearningFeedbackPackageRepository`, `OMPublicationRepository`,
`OMComponentRegistryRepository` — plus `errors.ts` (27 controlled error
classes) and `index.ts`. Wired into `packages/database/src/index.ts`'s
root barrel with no type-name collisions against existing DA/BO/BI/DT/
SIM/ADI/ABA exports.

## Security

All repository writes use parameterized queries via `withTenantTransaction`.
No raw string interpolation into SQL. Controlled error classes (never raw
database errors) surfaced to callers. `om-to-cl.ts` rejects credential-like
keys, `__proto__`/`prototype`/`constructor` keys, non-plain objects,
unserializable values, and enforces a 512 KiB payload bound — mirroring
the `aba-to-om.ts` / `adi-to-aba.ts` precedent exactly.

The "OM observes and evaluates; it does not silently rewrite historical
decisions" boundary is enforced at three independent layers, each with a
passing test:

1. **Schema documentation** — table/column comments on `outcome_observations`
   ("permanently immutable", "preserved separately from expected outcomes
   and are never a silent rewrite of an earlier decision") and
   `action_execution_observations` ("never itself a record of having
   executed anything").
2. **Database trigger** — `enforce_observation_immutability` /
   `enforce_observation_version_immutability`: once decided, an
   observation can never be silently reopened or overwritten. Live-tested
   (direct SQL `UPDATE` against both header and version, both rejected
   with `/immutable/`).
3. **Handoff contract** — `validateOMToCLHandoff` rejects payloads
   containing `learningUpdate`, `learningRecord`, `modelUpdate`,
   `policyUpdate`, `policyRevision`, `trainingUpdate`, `decisionOverride`,
   `decisionRevision`, `recommendationOverride`, `approvalOverride`,
   `executionResult`, `executedAt`, or `actionTaken`, and rejects any
   `feedbackStatus` other than `ready` — dedicated contract tests for
   each boundary category, all passing.

## Structural Tests

`packages/database/tests/migration-stage2i.test.ts` — **190 tests**, all
passing (minimum required: 150).

## Live Integration Tests

`packages/database/tests/om-repositories.integration.test.ts` — **122
tests (121 passing, 1 skip-guard)**, all passing (minimum required: 120).
Covers all 13 repositories, schema/RLS posture, cross-tenant isolation (8
tests), outbox atomicity (11 tests), and transaction rollback (3 tests).

## Contract Tests

- Inbound (`aba-to-om.contract.test.ts`): 32 tests, unchanged, passing
  (minimum required: 20).
- Outbound (`om-to-cl.contract.test.ts`): 31 tests, passing (minimum
  required: 20).

## Regression Results

| Gate | Result |
|---|---|
| `@infinicus/database` full suite (19 files) | 2309 passed / 6 skipped |
| `@infinicus/database` full suite, run twice consecutively | Identical: 2309 passed / 6 skipped both runs |
| `@infinicus/handoff-contracts` full suite | 191 passed (160 pre-BUILD-16 + 31 new) |
| Root browser regression (`.test.mjs`, 189 files) | 188 pass / 1 pre-existing failure — see Known Limitations |
| Full ADI browser regression (27 files) | 27/27 pass |
| Simulation adapter regression (`engine-v3-adapter.test.ts`) | 26/26 pass, unchanged |
| `pnpm lint` (21 packages) | 0 errors (5 pre-existing `no-console` warnings in `client.ts`/`migrate.ts`, unrelated to this build) |
| `pnpm typecheck` | 0 errors |
| `git diff --check` | clean |

## Empty-Database Install

Fresh database (`infinicus_test_empty`), migrations `0001`→`0121` applied
in one pass with zero errors. Verified 45 `outcome_monitoring` tables
present post-install (121/121 migrations registered). Database dropped
after verification.

## Migration Idempotency

Re-running `runMigrations()` against the already-migrated database: all
121 migrations reported `skip` (zero re-applications, zero errors).

## Outbox Atomicity

All 10 `om.*` `emit_*` functions live-tested via direct SQL against the
admin connection: each inserts exactly one `pending` row into
`events.outbox_events` per call; `emit_data_published` verified to reject
an invalid target layer and accept `continuous_learning`.

## Transaction Rollback

Live-verified: (1) an application-level validation failure leaves zero
rows in the affected table (a database-level CHECK-constraint rejection on
an unknown threshold operator); (2) an out-of-band raw SQL insert
violating a database-level bound (`attributed_weight = 2.0`, outside the
`[0,1]` CHECK) is rejected and leaves zero rows (defense in depth); (3)
duplicate intake idempotency keys against different ABA source packages
resolve as an application-level replay, not a database error.

## Files Created

- 15 migrations: `0107`–`0121` (see Migration Range).
- 13 repository files + `errors.ts` + `index.ts` under
  `packages/database/src/repositories/om/`.
- `packages/database/tests/migration-stage2i.test.ts`
- `packages/database/tests/om-repositories.integration.test.ts`
- `packages/handoff-contracts/tests/om-to-cl.contract.test.ts`
- `infinicus-platform/docs/database-stage-2i-outcome-monitoring.md`

## Files Modified

- `packages/handoff-contracts/src/om-to-cl.ts` (6-line placeholder →
  full contract).
- `packages/database/src/index.ts` (OM repository exports wired in).
- `packages/event-contracts/src/index.ts` (10 `om.*` events added,
  `om.outcome.evaluated` retained as pre-existing/not superseded).

## Documentation

`infinicus-platform/docs/database-stage-2i-outcome-monitoring.md`
created — full schema, RLS, append-only, lifecycle-guard, handoff, event,
repository, and testing documentation, plus the authority-boundary
section.

## Out-of-Scope Confirmation

No browser platform assembly, later database stages (2J), external
brokers, production deployment, frontend redesign, unrelated refactors, or
authority owned by another layer were touched. Continuous Learning
persistence was not implemented. The Simulation engine and its adapter
were not modified (confirmed by the unchanged 26/26
`engine-v3-adapter.test.ts` result).

## Known Limitations

- `platform/tests/01-file-existence.test.mjs` asserts (frozen from
  BUILD-10) that no migration beyond `0049` exists. This assertion has
  been stale since BUILD-12 first legitimately extended migrations past
  `0049`, and remains stale after Stage 2H (BUILD-15) and Stage 2I
  (BUILD-16) for the same reason. It is a pre-existing condition, not a
  regression introduced by this build, and correcting a frozen BUILD-10
  test file is out of this build's scope.
- The local disposable PostgreSQL instance backing this session's live
  tests persisted across a mid-session worker restart; data was
  re-verified intact post-restart before completing this report. No
  credentials were re-provisioned or committed (matches the repository's
  standing security rule that these are local disposable test credentials
  only, never persisted to any file).

## Queue Transition

`BUILD-16: pending → ready → in_progress → completed`. `currentReadyBuild`
remains `null` — **BUILD-17 was not readied or started**, per explicit
instruction.

## Commit

`f71d9d2` — "Add BUILD-16: Database Stage 2I (Outcome Monitoring)
persistence"

## Branch

`claude/infinicus-engine-debug-3loqb4`

## PR

#10 (tracking PR for this branch) — updated with this build's summary.

## Next Build

BUILD-17 (Database Stage 2J — Continuous Learning persistence) is **not**
readied. Per BUILD-16 specification §16, re-verify its preconditions
against its frozen specification and the current repository state before
marking it ready. This completes the Stage 1–2J persistence route.
