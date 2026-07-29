# BUILD-12 Completion Report — DB-DT: Database Stage 2E Business Digital Twin Persistence

- **Build ID:** BUILD-12
- **Layer:** DB-DT (database/repository tier — distinct from the browser digital-twin root blocks, BUILD-01)
- **Date:** 2026-07-22
- **Branch:** `claude/infinicus-engine-debug-3loqb4`
- **Specification:** `docs/implementation-queue/BUILD-12-DB-DT-SPECIFICATION.md` (followed exactly; SHA-256 `571b2aae5bdc68ba8755d8e88b4197a986e519f8cb86ae40a3983c17fe504420`, re-verified matching at completion)
- **Status:** COMPLETED

## What Was Built

A new `business_digital_twin` PostgreSQL schema (migrations **0050–0062**, 13 files) implementing all 12 required table groups from the frozen specification, plus 12 strict TypeScript repository adapters, 16 DT outbox events, and completion of the `bi-to-dt.ts` and `dt-to-sim.ts` handoff contracts.

### Migration range and integrity

| | |
|---|---|
| Frozen Stage 2D final migration | `0049` (verified, not guessed) |
| Stage 2E range | `0050`–`0062` |
| Frozen migrations 0001–0049 | unmodified — confirmed via `git diff` (empty) against the committed baseline |
| Migration self-registration | all 13 files insert into `_migrations` with `ON CONFLICT (filename) DO NOTHING`, matching the Stage 2B–2D convention |

### Schema objects (live-verified)

| Object | Count |
|---|---|
| Tables | 51 |
| Tables with RLS enabled **and forced** | 51/51 |
| Indexes | 338 |
| Triggers | 55 (17 `updated_at`, 31 append-only guards via one DO-block loop, 6 dedicated lifecycle/immutability guards, 1 publication lifecycle guard) |
| Functions | 25 (`forbid_mutation`, 6 dedicated guard functions, `enforce_publication_transition`, `emit_outbox_event`, 16 `emit_*` event wrappers) |

### Table groups (all 12 required groups implemented)

A. Intake/lineage — `dt_intake_packages`, `_versions`, `_source_references`, `_processing_status_history`
B. Definitions — `digital_twin_definitions`, `_versions`, `_components`, `_relationships`
C. Instances — `digital_twin_instances`, `_versions`, `_status_history`
D. State variables — `state_variable_definitions`, `_versions`, `state_variable_values`, `_quality`
E. Snapshots — `digital_twin_snapshots`, `_versions`, `_values`, `_evidence`, `_status_history`
F. Entities — `twin_entities`, `_versions`, `twin_relationships`, `_versions`
G. Assumptions/constraints — `twin_assumptions`, `_versions`, `twin_constraints`, `_versions`, `twin_constraint_evaluations`
H. Calibration/validation — `twin_calibration_runs`, `_inputs`, `_results`, `twin_validation_runs`, `_results`, `_issues`
I. Uncertainty — `twin_uncertainty_models`, `_versions`, `twin_uncertainty_assignments`, `twin_confidence_scores`
J. Scenario baselines — `scenario_baselines`, `_versions`, `_inputs`, `_constraints`
K. Publication — `dt_insight_packages`, `_versions`, `dt_publication_packages`, `_events`
L. Registry/deployment — `dt_component_registry`, `_versions`, `dt_deployments`, `_rollbacks`

### RLS — enabled AND forced (consistent with Stage 2D convention, AD-012)

All 51 tables use `ENABLE ROW LEVEL SECURITY` **and** `FORCE ROW LEVEL SECURITY`. The null-safe fail-closed policy predicate (`current_setting('app.tenant_id', true)::uuid AND current_setting('app.workspace_id', true)::uuid`) is preserved unchanged. Live-verified: missing context returns zero rows; cross-tenant reads/writes rejected across definitions, instances, entity graphs, state-variable values, and publication packages.

### Append-only enforcement

31 evidence/history tables reject UPDATE and DELETE unconditionally via a shared `forbid_mutation()` trigger — enforced even for the BYPASSRLS admin role. Six tables that carry their own lifecycle status get dedicated narrow guards instead of blanket append-only enforcement: `enforce_snapshot_immutability` / `enforce_snapshot_version_immutability`, `enforce_scenario_baseline_immutability` / `enforce_scenario_baseline_version_immutability`, and `enforce_definition_immutability` / `enforce_definition_version_immutability` (each blocking only the specific illegal status transition, mirrored between a header table and its version table). `dt_publication_packages` gets `enforce_publication_transition`, rejecting any lifecycle jump outside the defined state machine (`draft→ready→dispatched→{acknowledged,rejected,revoked}`, `acknowledged→revoked`).

### BI→DT and DT→SIM handoff contracts

- `packages/handoff-contracts/src/bi-to-dt.ts` — placeholder replaced with a strict versioned (`1.0.0`) `LayerHandoff` contract. Accepts only `ready`/`dispatched` BI publication packages; rejects malformed payloads, missing ownership, invalid period ordering, non-serializable content, credential-like data, and embedded Simulation/ADI/approval conclusions (`simulationRun`/`simulationOutput`/`adiDecision`/`adiRecommendation`/`approval`/`executionResult` forbidden). 22 contract tests.
- `packages/handoff-contracts/src/dt-to-sim.ts` — placeholder replaced with a strict versioned (`1.0.0`) `LayerHandoff` contract. Accepts only a published scenario baseline built from a published snapshot, with uncertainty required for numeric variables; rejects embedded recommendation/approval/decision content. 23 contract tests.

### DT events

16 required events added to `LayerEventType` (superseding the single `dt.state.updated` stub): `dt.intake.received/accepted/rejected`, `dt.definition.published`, `dt.instance.created/status_changed`, `dt.snapshot.created/validated/published`, `dt.calibration.started/completed/failed`, `dt.validation.completed`, `dt.scenario_baseline.created/published`, `dt.data.published`. Each backed by a `SECURITY DEFINER` emit function; `dt.data.published` rejects target layers outside `{simulation}`.

### Repositories (`packages/database/src/repositories/dt/`)

12 strict-TypeScript repositories matching the spec's minimum responsibility list (`DTPublicationPackageRepository` additionally owns `createInsightPackage`, justified because the spec has no separate insight-package-header repository, unlike BI's split design): `DTIntakeRepository`, `DigitalTwinDefinitionRepository`, `DigitalTwinInstanceRepository`, `DigitalTwinSnapshotRepository`, `StateVariableRepository`, `TwinEntityRepository`, `TwinAssumptionConstraintRepository`, `TwinCalibrationRepository`, `TwinValidationRepository`, `ScenarioBaselineRepository`, `DTPublicationPackageRepository`, `DTComponentRegistryRepository`. Parameterized SQL throughout; `withTenantTransaction`; typed error hierarchy (4 generic + 20 named subclasses); `parseFloat(String(...))` on all `numeric` columns; no `any`, no unsafe casts, no silent catches. Every method that emits an event inlines the insert on the shared `client` — never opens a nested `withTenantTransaction` (the BUILD-09-discovered pitfall).

## Defects Found and Fixed During Implementation

1. **Migration syntax error** — `0054_create_dt_entities.sql`'s `twin_entities` table had two `CONSTRAINT` clauses with no comma between them (a table-generator bug). Caused `syntax error at or near "CONSTRAINT"`. Fixed before first apply.
2. **Append-only design conflict (caught by the live integration test suite, fixed before completion)** — the initial draft of migration 0062 placed `digital_twin_definition_versions`, `digital_twin_snapshot_versions`, and `scenario_baseline_versions` in the unconditional `forbid_mutation` append-only list. This contradicted their own table comments ("immutable once published/active") and broke `DigitalTwinDefinitionRepository.validateVersion`/`activateVersion`, `DigitalTwinSnapshotRepository.validateSnapshot`/`publishSnapshot`, and `ScenarioBaselineRepository.validateBaseline`/`publishBaseline` — all of which update the version row's own `status` column as part of normal lifecycle transitions. Fixed by removing these three tables from the blanket append-only list and giving each a dedicated guard (`enforce_definition_version_immutability`, `enforce_snapshot_version_immutability`, `enforce_scenario_baseline_version_immutability`) scoped narrowly to the status column, mirroring the pattern already used on their header tables. The whole disposable test database was dropped, recreated, and re-migrated from empty afterward to verify the corrected migration installs cleanly.
3. **Missing app_test_user grants on the new schema** — `business_digital_twin` schema/tables/functions had no `GRANT` to `app_test_user` (grants are applied out-of-band per the repository's established convention, not via committed migrations). Applied `GRANT USAGE`/`SELECT, INSERT, UPDATE, DELETE`/`EXECUTE` matching the existing `business_intelligence` grant pattern.
4. **Lint errors** — three unused-import/parameter ESLint errors in the new repositories (`DTComponentRegistryRepository.activateVersion`'s unused version-id parameter, an unused `DTPublicationStateConflictError` import, an unused `NotFoundError` import). Fixed by prefixing the unused parameter with `_` and removing the unused imports.

## Validation Results

| Gate | Result |
|---|---|
| Structural tests (`migration-stage2e.test.ts`) | 184/184 pass |
| Live integration tests (`dt-repositories.integration.test.ts`) | 157/157 pass (1 intentional skip-guard when `DATABASE_URL` unset) — **exceeds the ≥120 meaningful-test requirement** |
| BI→DT contract tests | 22/22 pass |
| DT→SIM contract tests | 23/23 pass |
| Full database package (all 11 test files) | 1043/1043 pass (2 intentional skips) — run twice against the same DB with identical results, confirming rerun/idempotency |
| Migration rerun/idempotency (via built `migrate.ts`) | confirmed — all 62 files reported `skip` on second run, "Migrations complete." |
| Empty-database installation | confirmed — full drop/recreate + apply of 0001→0062 in strict order, zero errors |
| Frozen migrations 0001–0049 | unmodified (`git diff` empty) |
| RLS enabled + forced | 51/51 tables (live query) |
| Fail-closed (no context) | 0 rows returned (live query) |
| Cross-tenant/workspace rejection | verified live for definitions, instances, entity graphs, state-variable values, publication packages |
| Append-only enforcement | verified live via direct `UPDATE`/`DELETE` attempts against 10+ representative tables, all rejected |
| Publish-once immutability | verified live on `digital_twin_snapshots`/`_versions`, `scenario_baselines`/`_versions`, and reverting `digital_twin_definitions`/`_versions` to draft |
| Outbox atomicity | verified live — all 16 `emit_*` functions insert into `events.outbox_events`; `emit_data_published` rejects invalid target layers |
| Transaction rollback | verified — failed validation and failed CHECK constraints leave zero partial rows |
| handoff-contracts full suite (bi-to-dt + dt-to-sim + bo-to-bi + dal-to-bo + sim-to-adi regression) | 90/90 pass |
| Root layer regression (DA+ADI+ABA+BI+DT+OM+CL) | 180/180 pass |
| Monorepo ADI layer regression | 106/106 pass |
| `pnpm lint` | 21/21 tasks (0 errors; pre-existing unrelated `no-console` warnings) |
| `pnpm typecheck` | clean |
| `pnpm build` | 21/21 tasks |

Also confirmed: **no browser DT root blocks (BUILD-01) modified; no Simulation/ADI/ABA/OM/CL persistence implemented; no Simulation persistence added (Stage 2F, BUILD-13); BUILD-10 platform assembly untouched; frozen specification unchanged during implementation (checksum re-verified matching); no BUILD-13 auto-readied.**

## Known Limitations

- Simulation persistence (Stage 2F) is not included — the DT→SIM handoff contract is complete and tested, but no `simulation` schema or repositories exist yet.
- ADI/ABA/OM/CL persistence is not included.
- BUILD-10 browser platform assembly is a separate track and is unaffected by this build.
- No external message broker or production deployment was added; the outbox pattern (`events.outbox_events`) remains the durability boundary, matching every prior database-stage build.

## Environmental Note

The local test PostgreSQL service and its data required re-provisioning during this session (container restart, unrelated to BUILD-12 logic). The disposable `infinicus_test` database, roles, and grants were re-provisioned from empty. The append-only design defect (item 2 above) was caught by this re-provisioning cycle's fresh empty-database install before the build was reported complete — the final validation pass (all numbers above) was captured against a freshly re-provisioned database applying all 62 migrations from empty.

## Queue Transition

- BUILD-12: ready → in_progress → **completed**
- `currentReadyBuild` → `null` (per specification §20: "Do not create or ready BUILD-13 automatically")
- BUILD-13 (DB-SIM — Database Stage 2F, Simulation persistence) remains **pending**: its preconditions must be explicitly re-verified against the current repository state before it is marked ready.
