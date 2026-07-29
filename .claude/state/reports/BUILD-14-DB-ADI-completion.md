# BUILD-14 — Database Stage 2G AI Decision Intelligence Persistence — Completion Report

**Build ID:** BUILD-14
**Layer:** DB-ADI
**Date:** 2026-07-22
**Branch:** `claude/infinicus-engine-debug-3loqb4`

## What Was Built

The `ai_decision_intelligence` PostgreSQL schema (47 tables) persisting AI
Decision Intelligence's governed reasoning evidence: SIM→ADI intake,
decision questions and cases, reasoning runs, evidence, alternatives,
recommendations, confidence and limitations, policies and governance,
monitoring requirements, publication to Approved Business Action, and a
component registry with deployment history. This is the database
persistence tier only — the root browser ADI layer blocks and Engine v3
Simulation runtime are unmodified.

## Migration Range

`0077_create_adi_schema_intake.sql` through
`0091_create_adi_triggers_events.sql` (15 files). Next free migration after
this build: `0092`.

## Frozen Migration Verification

`git diff --stat` against migrations `0001`–`0076` is empty — the frozen
range was not touched. Verified via direct `git diff` before and after this
build's changes.

## Schema Objects (live-verified)

| Object | Count |
|---|---|
| Tables | 47 |
| Indexes | 223 |
| RLS-enabled-and-forced tables | 47 / 47 |
| RLS policies | 47 |
| Functions | 15 |
| Triggers | 48 |

## Table Groups (all 12 required groups implemented)

A. Intake and lineage (4) · B. Decision questions (4) · C. Decision cases
(4) · D. Reasoning runs (4) · E. Evidence (4) · F. Alternatives (4) ·
G. Recommendations (4) · H. Confidence and limitations (4) · I. Policies
and governance (4) · J. Monitoring requirements (3) · K. Publication (4) ·
L. Registry and deployment (4). Total: 47 tables (minimum required: 47).

## RLS

All 47 tables: `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`,
null-safe fail-closed predicate on `(tenant_id, workspace_id)`. Live-verified
missing-context read returns zero rows (`app_test_user`, no session
context set). Live-verified cross-tenant reads/writes rejected across 6
distinct repositories in the integration suite.

## Append-Only Enforcement

31 evidence/history tables via shared `forbid_mutation()` trigger attached
through a dynamic `DO $$ FOREACH $$` loop. `decision_recommendation_versions`
is excluded (dedicated guard below — it is the only `_versions` table in
this schema carrying its own independent `status` column). All 31
append-only tables live-tested for `UPDATE` rejection (12 direct tests) in
the integration suite.

## Lifecycle Guards

- `enforce_recommendation_immutability` / `enforce_recommendation_version_immutability`:
  published recommendations/versions reject any further status change.
  Live-verified via direct SQL `UPDATE` against both tables post-publish.
- `enforce_publication_transition`: `draft → ready → dispatched →
  {acknowledged, rejected, revoked}`, `acknowledged → revoked`. Live-verified
  legal transitions succeed and an illegal transition
  (`draft → dispatched`) throws `InvalidTransitionError`.

## Inbound Handoff

`sim-to-adi.ts` (v1.1.0, extended in BUILD-13) re-verified against every
BUILD-14 §6 requirement — already fully compliant (tenant/workspace/business
ownership, correlation/causation, source reference, version/status
eligibility, effective time, evidence/lineage, idempotency, 512 KiB bound,
credential/dangerous-key rejection). **No changes made.** Its 21-test
contract suite remains passing unchanged.

## Outbound Handoff

`adi-to-aba.ts` (v1.0.0) implemented in full, replacing the 6-line
placeholder. Carries a published `decision_recommendation_versions` record
only, targeted exclusively at `approved_business_action`. Enforces every
§6 requirement plus the authority boundary (see below). 31 contract tests,
all passing.

## Events

10 required `adi.*` events, each with a dedicated SECURITY DEFINER
`emit_*` wrapper calling the shared `emit_outbox_event` helper.
`emit_data_published` rejects any target layer other than
`approved_business_action`. The legacy `adi.decision.generated` event type
is retained in `LayerEventType` as superseded (documented inline), matching
the BI/DT/SIM precedent. All 10 events live-tested for atomic outbox
insertion.

## Repositories

12 repositories under `packages/database/src/repositories/adi/` — one per
table group: `ADIIntakeRepository`, `DecisionQuestionRepository`,
`DecisionCaseRepository`, `ReasoningRunRepository`,
`DecisionEvidenceRepository`, `DecisionAlternativeRepository`,
`DecisionRecommendationRepository`, `DecisionConfidenceRepository`,
`DecisionPolicyRepository`, `DecisionMonitoringRequirementRepository`,
`ADIPublicationRepository`, `ADIComponentRegistryRepository` — plus
`errors.ts` (26 controlled error classes) and `index.ts`. Wired into
`packages/database/src/index.ts`'s root barrel with no type-name
collisions against existing DA/BO/BI/DT/SIM exports.

## Security

All repository writes use parameterized queries via `withTenantTransaction`.
No raw string interpolation into SQL. Controlled error classes (never raw
database errors) surfaced to callers. `adi-to-aba.ts` rejects credential-like
keys, `__proto__`/`prototype`/`constructor` keys, non-plain objects,
unserializable values, and enforces a 512 KiB payload bound — mirroring the
`sim-to-adi.ts` / `dt-to-sim.ts` precedent exactly.

## Authority-Boundary Proof

The BUILD-14 authority boundary ("ADI may: evaluate evidence; generate
recommendations; calculate confidence; identify risks; rank alternatives;
publish a decision recommendation package. ADI must not: approve its own
recommendation; execute actions; fabricate Simulation evidence; modify
downstream ABA state; record outcomes; create learning updates.") is
enforced at three independent layers, each with a passing test:

1. **Schema documentation** — table/column comments on `decision_cases`
   ("ADI evaluates and recommends here; it never approves or executes"),
   `decision_recommendations` ("ADI never approves or executes it"),
   `recommendation_implementation_steps` ("execution authority belongs to
   ABA"), `decision_monitoring_requirements` ("it never records outcomes
   itself; that is the authority of Outcome Monitoring"), and
   `adi_publication_packages` ("never an approval or execution outcome").
2. **Database trigger** — `enforce_recommendation_immutability` /
   `enforce_recommendation_version_immutability`: once published, a
   recommendation can never be silently mutated into (or treated as) an
   approval. Live-tested (2 tests: header + version, direct SQL `UPDATE`
   both rejected with `/immutable/`).
3. **Handoff contract** — `validateADIToABAHandoff` rejects payloads
   containing `approval`, `approved`, `approvedBy`, `approvalStatus`,
   `executionResult`, `execute`, `executedAt`, `actionTaken`, `outcome`,
   `observedOutcome`, `outcomeRecord`, `learningUpdate`, or
   `learningRecord` — 4 dedicated contract tests, one per boundary category
   (approval, execution, outcome, learning-update), all passing.

## Adapters Introduced

None. Unlike BUILD-12/13 (which required a `workspaceId`/`idempotencyKey`
caller-supplied-option adapter pattern for `sim-to-adi-mapper.ts`),
BUILD-14's inbound contract (`sim-to-adi.ts`) required zero changes, and no
persistence-vs-browser contract mismatch was found that required an
adapter. The `adi-to-aba.ts` outbound contract is new and was designed
directly against the ADI persistence schema, so no adapter layer was
needed there either.

## Structural Tests

`packages/database/tests/migration-stage2g.test.ts` — **204 tests**, all
passing (minimum required: 150).

## Live Integration Tests

`packages/database/tests/adi-repositories.integration.test.ts` — **138
tests**, all passing (minimum required: 120). Covers all 12 repositories,
schema/RLS posture, cross-tenant isolation (6 tests), outbox atomicity (11
tests), and transaction rollback (3 tests).

## Contract Tests

- Inbound (`sim-to-adi.contract.test.ts`): 21 tests, unchanged, passing
  (minimum required: 20).
- Outbound (`adi-to-aba.contract.test.ts`): 31 tests, passing (minimum
  required: 20).

## Regression Results

| Gate | Result |
|---|---|
| `@infinicus/database` full suite (15 files) | 1678 passed / 4 skipped |
| `@infinicus/database` full suite, run twice consecutively | Identical: 1678 passed / 4 skipped both runs |
| `@infinicus/handoff-contracts` full suite (7 files) | 159 passed (128 pre-BUILD-14 + 31 new) |
| Root browser regression (`.test.mjs`, 189 files) | 188 pass / 1 pre-existing failure — see Known Limitations |
| Full ADI browser regression (27 files) | 27/27 pass |
| Simulation adapter regression (`engine-v3-adapter.test.ts`) | 26/26 pass, unchanged |
| `pnpm lint` (21 packages) | 0 errors (5 pre-existing `no-console` warnings in `client.ts`/`migrate.ts`, unrelated to this build) |
| `pnpm typecheck` | 0 errors |
| `pnpm build` (21 packages) | 0 errors |
| `git diff --check` | clean |

## Empty-Database Install

Fresh database (`infinicus_test_empty`), migrations `0001`→`0091` applied
in one pass with zero errors. Verified 47 `ai_decision_intelligence` tables
present post-install. Database dropped after verification.

## Migration Idempotency

Re-running `runMigrations()` against the already-migrated database: all 91
migrations reported `skip` (zero re-applications, zero errors).

## Outbox Atomicity

All 10 `adi.*` `emit_*` functions live-tested via direct SQL against the
admin connection: each inserts exactly one `pending` row into
`events.outbox_events` per call; `emit_reasoning_failed` and
`emit_guardrail_violated` verified to carry their extra payload fields
(`failureCode`, `severity`); `emit_data_published` verified to reject an
invalid target layer and accept `approved_business_action`.

## Transaction Rollback

Live-verified: (1) an application-level validation failure
(`DecisionEvidenceRepository.createVersion` with `confidence = 5.0`) leaves
zero rows in `decision_evidence_versions`; (2) an out-of-band raw SQL
insert violating a database-level `CHECK` bound
(`decision_confidence_scores.confidence = 2.0`) is rejected and leaves zero
rows (defense in depth); (3) duplicate intake idempotency keys against two
different SIM source packages resolve as an application-level replay, not
a database error.

## Files Created

- 15 migrations: `0077`–`0091` (see Migration Range).
- 12 repository files + `errors.ts` + `index.ts` under
  `packages/database/src/repositories/adi/`.
- `packages/database/tests/migration-stage2g.test.ts`
- `packages/database/tests/adi-repositories.integration.test.ts`
- `packages/handoff-contracts/tests/adi-to-aba.contract.test.ts`
- `infinicus-platform/docs/database-stage-2g-ai-decision-intelligence.md`

## Files Modified

- `packages/handoff-contracts/src/adi-to-aba.ts` (6-line placeholder →
  full contract).
- `packages/database/src/index.ts` (ADI repository exports wired in).
- `packages/event-contracts/src/index.ts` (10 `adi.*` events added,
  `adi.decision.generated` marked superseded).

## Documentation

`infinicus-platform/docs/database-stage-2g-ai-decision-intelligence.md`
created — full schema, RLS, append-only, lifecycle-guard, handoff, event,
repository, and testing documentation, plus the authority-boundary section.

## Out-of-Scope Confirmation

No browser platform assembly, later database stages (2H/2I/2J), external
brokers, production deployment, frontend redesign, unrelated refactors, or
authority owned by another layer were touched. ABA persistence was not
implemented. The Simulation engine and its adapter were not modified
(confirmed by the unchanged 26/26 `engine-v3-adapter.test.ts` result).

## Known Limitations

- `platform/tests/01-file-existence.test.mjs` asserts (frozen from
  BUILD-10) that no migration beyond `0049` exists. This assertion has been
  stale since BUILD-12 first legitimately extended migrations past `0049`,
  and remains stale after Stage 2F (BUILD-13) and Stage 2G (BUILD-14) for
  the same reason. It is a pre-existing condition, not a regression
  introduced by this build, and correcting a frozen BUILD-10 test file is
  out of this build's scope.
- This build's container was a fresh environment; the local disposable
  PostgreSQL instance, `infinicus_test_admin`/`app_test_user` roles, and
  `infinicus_test` database were re-provisioned from scratch this session
  (never committed — matches the repository's standing security rule that
  these are local disposable test credentials only, never persisted to any
  file).

## Queue Transition

`BUILD-14: pending → ready → in_progress → completed`. `currentReadyBuild`
remains `null` — **BUILD-15 was not readied or started**, per explicit
instruction.

## Commit

`2813ac3` — "feat(db): BUILD-14 Stage 2G AI Decision Intelligence
persistence"

## Branch

`claude/infinicus-engine-debug-3loqb4`

## PR

#10 (tracking PR for this branch) — updated with this build's summary.

## Next Build

BUILD-15 (Database Stage 2H — Approved Business Action persistence) is
**not** readied. Per BUILD-14 specification §16, re-verify its
preconditions against its frozen specification and the current repository
state before marking it ready.
