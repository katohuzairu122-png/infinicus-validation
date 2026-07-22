# Database Stage 2F — Simulation Schema

## Status

**COMPLETE — VALIDATED — FROZEN** (2026-07-22)

Frozen migration range after Stage 2F: **0001–0076**

## Overview

Stage 2F creates the `simulation` schema with 44 tables owning Simulation's
governed Monte Carlo evidence: validated intake of Business Digital Twin
publication packages, model and scenario definitions, run lifecycle,
iteration-level Monte Carlo evidence, curated results, risk and sensitivity
evidence, scenario comparisons, validation and calibration, and publication
of insight packages onward to AI Decision Intelligence.

This is the database/repository persistence tier for Simulation — distinct
from the root Engine v3 simulation code (characterized in BUILD-07 via
`layers/simulation/src/infrastructure/engine-v3-browser-adapter.ts`), which
remains the layer's actual Monte Carlo computation surface. Stage 2F does
not implement or alter simulation mathematics; it persists the engine's
inputs, outputs, and lifecycle. Engine v3 semantics (500-sample Monte Carlo,
90-day default horizon, `engineVersion === 'infinicus-engine-v3'`) are
preserved as column defaults, not hard-coded constraints, so a future
configurable model can still vary them.

## Migration Sequence

| File | Contents |
|------|----------|
| `0063_create_sim_schema_intake.sql` | `simulation` schema + `simulation_intake_packages`, `_versions`, `_source_references`, `_status_history` |
| `0064_create_sim_models.sql` | `simulation_models`, `_versions`, `_parameters`, `_constraints` |
| `0065_create_sim_scenarios.sql` | `simulation_scenarios`, `_versions`, `_inputs`, `_assumptions`, `_constraints` |
| `0066_create_sim_runs.sql` | `simulation_requests`, `simulation_runs`, `_status_history`, `_inputs` |
| `0067_create_sim_monte_carlo_evidence.sql` | `simulation_iterations`, `_iteration_summaries`, `simulation_distributions`, `simulation_percentiles` |
| `0068_create_sim_results.sql` | `simulation_results`, `_versions`, `_metrics`, `_evidence` |
| `0069_create_sim_risk_sensitivity.sql` | `simulation_risk_results`, `simulation_sensitivity_runs`, `_results`, `simulation_failure_modes` |
| `0070_create_sim_comparisons.sql` | `scenario_comparison_runs`, `_members`, `_results` |
| `0071_create_sim_validation_calibration.sql` | `simulation_validation_runs`, `_results`, `simulation_calibration_runs`, `_results` |
| `0072_create_sim_publication.sql` | `simulation_insight_packages`, `_versions`, `simulation_publication_packages`, `_events` |
| `0073_create_sim_registry.sql` | `simulation_component_registry`, `_versions`, `simulation_deployments`, `_rollbacks` |
| `0074_create_sim_indexes.sql` | 279 indexes across all 44 tables |
| `0075_create_sim_rls_policies.sql` | RLS enabled **and forced** on all 44 tables (null-safe tenant+workspace isolation) |
| `0076_create_sim_triggers_events.sql` | 13 `updated_at` triggers, append-only enforcement (27 tables), 7 lifecycle/immutability guards, 10 SECURITY DEFINER outbox functions |

Frozen migrations 0001–0062 were not modified (confirmed via `git diff` clean
against the committed baseline).

## Canonical Entity Integration (no duplication)

Stage 2F reuses `tenancy.tenants`, `tenancy.workspaces`, `platform.businesses`,
`identity.users`, and `business_digital_twin.dt_publication_packages`. No
tenant/workspace/business identity, user, or twin-truth table is duplicated.
`simulation_intake_packages.dt_publication_package_id` is a `NOT NULL` FK to
the canonical DT publication package.

## Row-Level Security — Enabled and Forced

All 44 tables use both `ENABLE ROW LEVEL SECURITY` and
`FORCE ROW LEVEL SECURITY`, matching the convention established in Stage 2D
(AD-012) and continued through Stage 2E. The null-safe fail-closed predicate
is unchanged:

```sql
USING (
  tenant_id    = current_setting('app.tenant_id',    true)::uuid
AND workspace_id = current_setting('app.workspace_id', true)::uuid
)
```

## Append-Only Enforcement

27 evidence/history tables reject `UPDATE` and `DELETE` unconditionally via a
shared `simulation.forbid_mutation()` trigger — enforced for every role,
including BYPASSRLS admin. Following the design fix discovered and applied
during BUILD-12, three version tables that carry their own lifecycle status
column (`simulation_model_versions`, `simulation_scenario_versions`,
`simulation_result_versions`) are excluded from the blanket append-only list
from the start and instead get dedicated narrowly-scoped guards:

- `enforce_model_immutability` / `enforce_model_version_immutability` —
  block `simulation_models` / `simulation_model_versions` reverting from
  `active`/`retired` to `draft`
- `enforce_scenario_immutability` / `enforce_scenario_version_immutability` —
  same pattern for `simulation_scenarios` / `simulation_scenario_versions`
- `enforce_result_immutability` / `enforce_result_version_immutability` —
  block `simulation_results` / `simulation_result_versions` status changes
  once `status = 'published'`
- `enforce_publication_transition` — enforces the valid
  `simulation_publication_packages` lifecycle state machine
  (`draft→ready→dispatched→{acknowledged,rejected,revoked}`,
  `acknowledged→revoked`); any other transition is rejected

**Operational implication:** because the append-only triggers apply to every
role and cascade via `ON DELETE RESTRICT` up through parent rows,
`simulation` evidence rows — and any tenant/business row they reference —
cannot be deleted once created. Test fixtures use disposable per-test
identifiers; the disposable test database is the reset mechanism, not
per-suite cleanup.

## Outbox Events

10 required events, each backed by a `SECURITY DEFINER` function using the
established `emit_outbox_event` helper: `sim.intake.received`,
`sim.scenario.created`, `sim.run.requested`, `sim.run.started`,
`sim.run.completed`, `sim.run.failed`, `sim.result.published`,
`sim.risk.calculated`, `sim.sensitivity.completed`, `sim.data.published`.
`sim.data.published` rejects target layers outside
`{ai_decision_intelligence}` — the sole authorized Stage 2F downstream
layer. The pre-existing `simulation.completed` placeholder event type
(never wired to an emitter) is superseded by `sim.run.completed`.

## DT-to-SIM and SIM-to-ADI Handoff Contracts

- `packages/handoff-contracts/src/dt-to-sim.ts` — verified against the
  BUILD-13 requirements list (tenant/workspace/business ownership,
  correlation, idempotency, serializability, 512 KiB payload bound,
  credential rejection); already complete from BUILD-12, no changes needed.
- `packages/handoff-contracts/src/sim-to-adi.ts` — extended from `1.0.0` to
  `1.1.0` (BUILD-07 predates the Stage 2A+ tenant/workspace/business +
  idempotency convention). Added: required `workspaceId` and
  `idempotencyKey` payload fields, a 512 KiB payload-size bound,
  credential-like key rejection, and `__proto__`/`prototype`/`constructor`
  key rejection. The browser-side producer
  (`layers/simulation/src/application/sim-to-adi-mapper.ts`) was updated to
  require a caller-supplied `workspaceId` (Engine v3's characterized
  `CompletedSimulationRun` has no workspace concept, so it is supplied by
  the caller rather than fabricated) and to default `idempotencyKey` to
  `` `${run.runId}::sim-to-adi` `` when the caller does not supply one.

## Repository Adapters (`packages/database/src/repositories/simulation/`)

| Repository | Coverage |
|---|---|
| `SimulationIntakeRepository` | intake, source refs, lifecycle transitions |
| `SimulationModelRepository` | models and versions, parameters, constraints, activation |
| `SimulationScenarioRepository` | scenarios and versions, inputs, assumptions, constraints, activation |
| `SimulationRunRepository` | requests, runs, lifecycle transitions, Monte Carlo evidence (iterations, summaries, distributions, percentiles) |
| `SimulationResultRepository` | results, metrics, evidence, validate/publish/supersede |
| `SimulationRiskRepository` | risk results, failure modes |
| `SimulationSensitivityRepository` | sensitivity runs and results |
| `ScenarioComparisonRepository` | comparison runs, members, results |
| `SimulationValidationRepository` | validation runs/results, calibration runs/results |
| `SimulationPublicationRepository` | insight packages, publication lifecycle |
| `SimulationComponentRegistryRepository` | component registry, deployment, rollback |

All repositories require a `TenantContext`, execute inside
`withTenantTransaction`, and use `parseFloat(String(...))` for `numeric`
columns per the established Stage 2C convention. Every method that emits an
event inlines the insert on the shared `client` parameter — never opens a
nested `withTenantTransaction` (the BUILD-09-discovered pitfall).

## Validation Results (verified at freeze, 2026-07-22)

Live database: local PostgreSQL 16, database `infinicus_test`. Full
empty-database installation of migrations 0001→0076, verified from a
freshly dropped/recreated database.

| Check | Result |
|---|---|
| Structural tests (`migration-stage2f.test.ts`) | 166/166 pass |
| Live integration tests (`simulation-repositories.integration.test.ts`) | 127/127 pass (1 intentional skip-guard) |
| Full `@infinicus/database` suite | 1336/1336 pass (3 intentional skip-guards); run twice against the same database with identical results |
| Contract tests (`dt-to-sim.contract.test.ts` + `sim-to-adi.contract.test.ts`) | 44/44 pass (23 + 21) |
| Full `@infinicus/handoff-contracts` suite | 97/97 pass |
| `layer-simulation` package suite (`engine-v3-adapter.test.ts`) | 26/26 pass |
| Lint | clean (0 errors; pre-existing `no-console` warnings in `client.ts`/`migrate.ts` unrelated to this build) |
| Typecheck | clean |
| Build | 21/21 tasks |
| Live schema | 44 tables, 44 RLS-forced, 279 indexes, 47 triggers, 19 functions |
| Frozen migration integrity | 0001–0062 unmodified (`git diff` clean) |
| Migration rerun idempotency | all 76 migrations report `skip` on second run |
| Root layer regression (DA+ADI+ABA+BI+DT+OM+CL `.test.mjs`) | 180/180 pass |
| Monorepo ADI layer regression | 106/106 pass |

The 127 live Simulation integration tests cover: fail-closed RLS,
cross-tenant rejection, DT intake and idempotency, model/scenario/run/
result/risk/sensitivity/comparison/validation/calibration lifecycle,
append-only enforcement, publish-once immutability on model/scenario/result
version rows, publication lifecycle and idempotent replay, Monte Carlo
evidence recording (iterations, summaries, distributions, percentiles),
outbox atomicity across all 10 events, and transaction rollback.

## Known Limitations

- ADI/ABA/OM/CL persistence is not included.
- BUILD-10 browser platform assembly is a separate track and is unaffected.
- No external message broker or production deployment was added; the
  outbox pattern remains the durability boundary.
- `sim-to-adi.ts`'s `workspaceId` is supplied by the caller, not derived
  from `CompletedSimulationRun` — Engine v3's browser-characterized run
  shape (BUILD-07) has no workspace concept. A future browser-side wiring
  change (out of scope for this database-persistence build) would be
  needed to thread a real workspace context through the Engine v3 facade
  itself.

## What Remains

- Stage 2G (AI Decision Intelligence persistence, BUILD-14) or later
  database work.
- Not started in Stage 2F.
