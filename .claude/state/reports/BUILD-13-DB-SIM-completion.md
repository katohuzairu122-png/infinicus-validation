# BUILD-13 Completion Report — DB-SIM: Database Stage 2F Simulation Persistence

- **Build ID:** BUILD-13
- **Layer:** DB-SIM (database/repository tier — distinct from the Engine v3 Monte Carlo core characterized in BUILD-07)
- **Date:** 2026-07-22
- **Branch:** `claude/infinicus-engine-debug-3loqb4`
- **Specification:** `docs/implementation-queue/BUILD-13-DB-SIM-SPECIFICATION.md` (followed exactly; SHA-256 `cb1c600e9cbbe2445959b233ccc01c9cd5428d98aafea142990e70969da6feda`, re-verified matching at completion)
- **Status:** COMPLETED

## What Was Built

A new `simulation` PostgreSQL schema (migrations **0063–0076**, 14 files) implementing all 11 required table groups from the frozen specification, plus 11 strict TypeScript repository adapters, 10 Simulation outbox events, and the required inbound/outbound handoff contract work (verifying `dt-to-sim.ts` and extending `sim-to-adi.ts`).

## Migration Range

| | |
|---|---|
| Frozen Stage 2E final migration | `0062` (verified, not guessed) |
| Stage 2F range | `0063`–`0076` |
| Allocation confirmed via `scripts/build-control/allocate-next-migration.mjs` | `{"highestExisting": 62, "nextFree": "0063"}` — matched the spec's expectation exactly |

## Frozen Migration Verification

Migrations 0001–0062 confirmed unmodified via `git diff` (empty) against the committed baseline, both before and after this build. `build-preflight.mjs` failed with a stale assumption (expects `CLAUDE.md` at repo root; this repository's is at `infinicus-platform/CLAUDE.md` — the same pre-existing tooling gap documented in the BUILD-12 report) — the equivalent checks were performed manually: BUILD-12 status confirmed `completed`, its specification checksum confirmed matching, migration boundary confirmed at `0062`, and no `simulation` schema existed anywhere in the frozen migrations before this build.

## Schema Objects (live-verified)

| Object | Count |
|---|---|
| Tables | 44 (spec minimum: 44 — met exactly) |
| Tables with RLS enabled **and forced** | 44/44 |
| Indexes | 279 |
| Triggers | 47 (13 `updated_at`, 27 append-only guards via one DO-block loop, 6 dedicated version/header immutability guards, 1 publication lifecycle guard) |
| Functions | 19 (`forbid_mutation`, 6 dedicated guard functions, `enforce_publication_transition`, `emit_outbox_event`, 10 `emit_*` event wrappers) |

## Table Groups (all 11 required groups implemented)

A. Intake/lineage — `simulation_intake_packages`, `_versions`, `_source_references`, `_status_history`
B. Models — `simulation_models`, `_versions`, `_parameters`, `_constraints`
C. Scenarios — `simulation_scenarios`, `_versions`, `_inputs`, `_assumptions`, `_constraints`
D. Run lifecycle — `simulation_requests`, `simulation_runs`, `_status_history`, `_inputs`
E. Monte Carlo evidence — `simulation_iterations`, `_iteration_summaries`, `simulation_distributions`, `simulation_percentiles`
F. Results — `simulation_results`, `_versions`, `_metrics`, `_evidence`
G. Risk/sensitivity — `simulation_risk_results`, `simulation_sensitivity_runs`, `_results`, `simulation_failure_modes`
H. Comparisons — `scenario_comparison_runs`, `_members`, `_results`
I. Validation/calibration — `simulation_validation_runs`, `_results`, `simulation_calibration_runs`, `_results`
J. Publication — `simulation_insight_packages`, `_versions`, `simulation_publication_packages`, `_events`
K. Registry/deployment — `simulation_component_registry`, `_versions`, `simulation_deployments`, `_rollbacks`

## RLS

All 44 tables use `ENABLE ROW LEVEL SECURITY` **and** `FORCE ROW LEVEL SECURITY`, matching the Stage 2D/2E convention (AD-012). The null-safe fail-closed policy predicate (`current_setting('app.tenant_id', true)::uuid AND current_setting('app.workspace_id', true)::uuid`) is preserved unchanged. Live-verified: missing context returns zero rows; cross-tenant reads/writes rejected across models, runs, sensitivity results, publication packages, and risk results.

## Append-Only Enforcement

27 evidence/history tables reject UPDATE and DELETE unconditionally via a shared `forbid_mutation()` trigger, enforced even for BYPASSRLS admin. Applying the design fix discovered and applied during BUILD-12, `simulation_model_versions`, `simulation_scenario_versions`, and `simulation_result_versions` were excluded from the blanket append-only list **from the first draft** (not retrofitted) because their repositories update the version row's own status column during normal lifecycle transitions. Each got a dedicated narrowly-scoped guard instead, mirroring their header table's guard.

## Lifecycle Guards

`enforce_model_immutability` / `enforce_model_version_immutability`, `enforce_scenario_immutability` / `enforce_scenario_version_immutability` (all block reverting `active`/`retired` to `draft`), `enforce_result_immutability` / `enforce_result_version_immutability` (block status changes once `published`), and `enforce_publication_transition` (enforces the `draft→ready→dispatched→{acknowledged,rejected,revoked}`, `acknowledged→revoked` state machine on `simulation_publication_packages`).

## Inbound Handoff

`packages/handoff-contracts/src/dt-to-sim.ts` — verified against every BUILD-13 §6 requirement (tenant/workspace/business ownership, correlation/causation, source artifact IDs, version/status eligibility, evidence/lineage, idempotency, serializability, 512 KiB payload bound, credential rejection, authority boundaries). Already complete from BUILD-12; no changes were required or made.

## Outbound Handoff

`packages/handoff-contracts/src/sim-to-adi.ts` — extended from contract version `1.0.0` to `1.1.0`. This BUILD-07 contract predates the Stage 2A+ tenant/workspace/business + idempotency convention and was missing `workspaceId`, `idempotencyKey`, a payload-size bound, and credential-key rejection. Added all four, plus `__proto__`/`prototype`/`constructor` key rejection (spec §9). The existing browser-side producer (`layers/simulation/src/application/sim-to-adi-mapper.ts`, `SimToADIMapperOptions`) was updated to accept a required `workspaceId` (supplied by the caller — Engine v3's characterized `CompletedSimulationRun` has no workspace field, and fabricating one would violate the mapper's own "no fabricated metrics" invariant) and an optional `idempotencyKey` defaulting to `` `${run.runId}::sim-to-adi` ``. This is a compatibility extension, not a replacement: the envelope shape, error types, and all pre-existing validation reasons are unchanged.

## Events

10 required events added to `LayerEventType` (superseding the single unused `simulation.completed` stub): `sim.intake.received`, `sim.scenario.created`, `sim.run.requested`, `sim.run.started`, `sim.run.completed`, `sim.run.failed`, `sim.result.published`, `sim.risk.calculated`, `sim.sensitivity.completed`, `sim.data.published`. Each backed by a `SECURITY DEFINER` emit function; `sim.data.published` rejects target layers outside `{ai_decision_intelligence}`.

## Repositories

11 strict-TypeScript repositories matching the spec's required list, under `packages/database/src/repositories/simulation/`: `SimulationIntakeRepository`, `SimulationModelRepository`, `SimulationScenarioRepository`, `SimulationRunRepository` (also owns Monte Carlo evidence recording — iterations, summaries, distributions, percentiles — since the spec's 11-repository list has no separate Group E repository and this evidence is keyed by `run_id`), `SimulationResultRepository`, `SimulationRiskRepository`, `SimulationSensitivityRepository`, `ScenarioComparisonRepository`, `SimulationValidationRepository` (also owns calibration, mirroring the spec's fold of Group I into one responsibility), `SimulationPublicationRepository`, `SimulationComponentRegistryRepository`. Parameterized SQL throughout; `withTenantTransaction`; the full controlled-error hierarchy required by spec §10; `parseFloat(String(...))` on all `numeric` columns. Every event-emitting method inlines its insert on the shared `client` — never opens a nested `withTenantTransaction`.

## Security

- Plain serializable inputs only; functions/symbols/BigInt/DOM references/class instances rejected by `collectUnserializable` (handoff contracts)
- `__proto__`/`prototype`/`constructor` keys rejected in `sim-to-adi.ts` (new for this build)
- Credential-like keys rejected in both handoff contracts
- 512 KiB payload bound enforced in both handoff contracts
- Fail-closed RLS scope validation live-verified
- No credentials committed anywhere; local disposable test credentials used only as shell env vars / inline connection strings

## Structural Tests

`migration-stage2f.test.ts` — **166/166 pass** (minimum: 150). Covers: file existence/transactional/self-registration for all 14 migration files; frozen-range checks; per-table `CREATE TABLE` assertions for all 44 tables; enum/status content checks; index count (≥200) and no-duplicate checks; RLS ENABLE/FORCE count (≥44) and policy-count-matches checks; trigger/guard-function/emit-function existence checks (including all 10 event wrapper functions, the append-only-exclusion check for the three version tables, and the `emit_data_published` target-layer restriction); repository/export file existence checks; handoff contract checks (`dt-to-sim.ts` completeness, `sim-to-adi.ts` version bump and new required fields); event-contracts `LayerEventType` union checks for all 10 `sim.*` events.

## Live Integration Tests

`simulation-repositories.integration.test.ts` — **127/127 pass** (1 intentional skip-guard when `DATABASE_URL` unset; minimum: 120). Covers: fail-closed RLS, cross-tenant rejection, DT intake and idempotency (via a full BI→DT→SIM upstream fixture chain), model/scenario/run/result/risk/sensitivity/comparison/validation/calibration lifecycle, invalid-transition rejection, append-only enforcement (10+ representative tables), publish-once immutability on model/scenario/result version rows, publication lifecycle and idempotent replay, Monte Carlo evidence recording and its uniqueness/validation constraints, outbox atomicity across all 10 events, and transaction rollback (both application-level and database-CHECK-level).

## Contract Tests

`dt-to-sim.contract.test.ts` — 23/23 pass (unchanged from BUILD-12; re-run as regression). `sim-to-adi.contract.test.ts` — extended from 18 to **21/21 pass** (minimum: 20), adding tests for the new `workspaceId`/`idempotencyKey` requirements, the payload-size bound, credential-key rejection, and the `randomSeed` type check.

## Regression Results

| Gate | Result |
|---|---|
| Full `@infinicus/database` suite | 1336/1336 pass (3 intentional skips) — run twice against the same DB with identical results |
| Full `@infinicus/handoff-contracts` suite | 97/97 pass |
| `@infinicus/layer-simulation` suite (`engine-v3-adapter.test.ts`) | 26/26 pass — confirms the `sim-to-adi-mapper.ts`/`SimToADIMapperOptions` change is backward-compatible |
| Root layer regression (DA+ADI+ABA+BI+DT+OM+CL `.test.mjs`) | 180/180 pass |
| Monorepo ADI layer regression | 106/106 pass |
| `pnpm lint` | 21/21 tasks (0 errors; pre-existing unrelated `no-console` warnings) |
| `pnpm typecheck` | clean |
| `pnpm build` | 21/21 tasks |
| `git diff --check` | clean |

## Empty-Database Install

Confirmed. Full drop/recreate of the disposable test database, then applied all 76 migrations (0001→0076) in strict order from empty. Zero errors. Live schema after install matched the reported object counts exactly.

## Migration Idempotency

Confirmed. Re-running the migration runner against the fully-migrated database reports `skip` for all 76 files and exits cleanly with "Migrations complete." — no duplicate objects, no errors.

## Outbox Atomicity

Confirmed. All 10 `emit_*` SECURITY DEFINER functions insert exactly one row into `events.outbox_events` per call via the shared `emit_outbox_event` helper. `emit_data_published` enforces its target-layer allowlist (`{ai_decision_intelligence}`) and rejects any other value with an exception before any insert occurs.

## Transaction Rollback

Confirmed. Application-level validation failures (e.g. an out-of-bounds `survival_rate`) leave zero rows behind. Database-level CHECK constraint violations attempted out-of-band also leave zero rows behind — defense in depth at both layers.

## Files Created

- `infinicus-platform/infrastructure/database/migrations/0063–0076` (14 files)
- `infinicus-platform/packages/database/src/repositories/simulation/` (13 files: 11 repositories + `errors.ts` + `index.ts`)
- `infinicus-platform/packages/database/tests/simulation-repositories.integration.test.ts`
- `infinicus-platform/packages/database/tests/migration-stage2f.test.ts`
- `infinicus-platform/docs/database-stage-2f-simulation.md`
- `.claude/state/reports/BUILD-13-DB-SIM-completion.md`

## Files Modified

- `infinicus-platform/packages/database/src/index.ts` (Simulation repository exports)
- `infinicus-platform/packages/event-contracts/src/index.ts` (10 `sim.*` events, superseding `simulation.completed`)
- `infinicus-platform/packages/handoff-contracts/src/sim-to-adi.ts` (`1.0.0` → `1.1.0`: `workspaceId`, `idempotencyKey`, payload bound, credential/dangerous-key rejection)
- `infinicus-platform/packages/handoff-contracts/tests/sim-to-adi.contract.test.ts` (fixture + new-requirement tests)
- `infinicus-platform/layers/simulation/src/application/sim-to-adi-mapper.ts` (`SimToADIMapperOptions.workspaceId` required, `idempotencyKey` optional with a derived default)
- `infinicus-platform/layers/simulation/tests/engine-v3-adapter.test.ts` (fixture update for the new required mapper option)
- `.claude/state/implementation-status.json` (BUILD-13 → completed)
- `docs/implementation-queue/00-IMPLEMENTATION-MANIFEST.md` (queue transition)
- `.claude/commands/execute-next-build.md` (pointer update)

## Documentation

`infinicus-platform/docs/database-stage-2f-simulation.md` — schema, migration range, table groups, RLS, append-only enforcement, lifecycle guards, both handoff contracts (including the `sim-to-adi.ts` version bump rationale), events, repositories, validation results, known limitations, next-stage boundary.

## Out-of-Scope Confirmation

Confirmed: no ADI/ABA/OM/CL persistence implemented; no browser platform assembly touched; the Engine v3 Monte Carlo core (`engine-v3-browser-adapter.ts`'s `execute`/`read` logic) was not modified — only the mapper's option surface was extended; no external broker or production deployment added; frozen specification unchanged during implementation (checksum re-verified matching); BUILD-14 not auto-readied.

## Known Limitations

- ADI/ABA/OM/CL persistence is not included.
- BUILD-10 browser platform assembly is a separate track and is unaffected by this build.
- No external message broker or production deployment was added; the outbox pattern (`events.outbox_events`) remains the durability boundary, matching every prior database-stage build.
- `sim-to-adi.ts`'s `workspaceId` is supplied by the caller, not derived from `CompletedSimulationRun` — Engine v3's browser-characterized run shape (BUILD-07) has no workspace concept. Threading a real workspace context through the Engine v3 facade itself is a browser-side change out of scope for this database-persistence build.

## Queue Transition

- BUILD-13: pending → ready → in_progress → **completed**
- `currentReadyBuild` → `null` (per specification §16: "Do not automatically implement or ready the next stage")
- BUILD-14 (DB-ADI — Database Stage 2G, AI Decision Intelligence persistence) remains **pending**: its preconditions must be explicitly re-verified against the current repository state before it is marked ready.

## Commit

See branch history for the commit hash recorded at push time.

## Branch

`claude/infinicus-engine-debug-3loqb4`

## PR

PR #10 (updated with a summary comment).

## Next Build

BUILD-14 (DB-ADI, Database Stage 2G — AI Decision Intelligence persistence) — not started, not readied.
