# Database Stage 2E — Business Digital Twin Schema

## Status

**COMPLETE — VALIDATED — FROZEN** (2026-07-22)

Frozen migration range after Stage 2E: **0001–0062**

## Overview

Stage 2E creates the `business_digital_twin` schema with 51 tables owning
Business Digital Twin's governed state representation: validated intake of
Business Intelligence publication packages, twin definitions and instances,
state variables, historical snapshots, governed entities/relationships,
assumptions/constraints, calibration and validation runs, uncertainty and
confidence evidence, scenario baselines, and publication of insight packages
onward to Simulation.

This is the database/repository persistence tier for DT — distinct from the
browser digital-twin root blocks (`digital-twin/`, INFINICUS-DT-01..25),
which remain the layer's twin-computation surface. Stage 2E does not
implement twin simulation or state-derivation algorithms; it persists their
inputs, outputs, and lifecycle.

## Migration Sequence

| File | Contents |
|------|----------|
| `0050_create_dt_schema_intake.sql` | `business_digital_twin` schema + `dt_intake_packages`, `_versions`, `_source_references`, `_processing_status_history` |
| `0051_create_dt_definitions_instances.sql` | `digital_twin_definitions`, `_versions`, `_components`, `_relationships`, `digital_twin_instances`, `_versions`, `_status_history` |
| `0052_create_dt_state_variables.sql` | `state_variable_definitions`, `_versions`, `state_variable_values`, `_quality` |
| `0053_create_dt_snapshots.sql` | `digital_twin_snapshots`, `_versions`, `_values`, `_evidence`, `_status_history` |
| `0054_create_dt_entities.sql` | `twin_entities`, `_versions`, `twin_relationships`, `_versions` |
| `0055_create_dt_assumptions_constraints.sql` | `twin_assumptions`, `_versions`, `twin_constraints`, `_versions`, `twin_constraint_evaluations` |
| `0056_create_dt_calibration_validation.sql` | `twin_calibration_runs`, `_inputs`, `_results`, `twin_validation_runs`, `_results`, `_issues` |
| `0057_create_dt_uncertainty.sql` | `twin_uncertainty_models`, `_versions`, `twin_uncertainty_assignments`, `twin_confidence_scores` |
| `0058_create_dt_scenario_baselines.sql` | `scenario_baselines`, `_versions`, `_inputs`, `_constraints` |
| `0059_create_dt_publication_registry.sql` | `dt_insight_packages`, `_versions`, `dt_publication_packages`, `_events`, `dt_component_registry`, `_versions`, `dt_deployments`, `_rollbacks` |
| `0060_create_dt_indexes.sql` | 338 indexes across all 51 tables |
| `0061_create_dt_rls_policies.sql` | RLS enabled **and forced** on all 51 tables (null-safe tenant+workspace isolation) |
| `0062_create_dt_triggers_events.sql` | 17 `updated_at` triggers, append-only enforcement (31 tables), 6 lifecycle/immutability guards, 16 SECURITY DEFINER outbox functions |

Frozen migrations 0001–0049 were not modified (byte-identical, verified via
`git diff` against the committed baseline).

## Canonical Entity Integration (no duplication)

Stage 2E reuses `tenancy.tenants`, `tenancy.workspaces`, `platform.businesses`,
`identity.users`, and `business_intelligence.bi_publication_packages`. No
tenant/workspace/business identity, user, or analytical-truth table is
duplicated. `dt_intake_packages.bi_publication_package_id` is a `NOT NULL`
FK to the canonical BI publication package.

## Row-Level Security — Enabled and Forced

All 51 tables use both `ENABLE ROW LEVEL SECURITY` and
`FORCE ROW LEVEL SECURITY`, matching the convention established in Stage 2D
(AD-012). The null-safe fail-closed predicate is unchanged:

```sql
USING (
  tenant_id    = current_setting('app.tenant_id',    true)::uuid
AND workspace_id = current_setting('app.workspace_id', true)::uuid
)
```

## Append-Only Enforcement

31 evidence/history tables reject `UPDATE` and `DELETE` unconditionally via
a shared `business_digital_twin.forbid_mutation()` trigger — enforced for
every role, including BYPASSRLS admin. Six tables that carry their own
lifecycle status get dedicated immutability/transition guards instead of
unconditional append-only enforcement, because their status column is
mutated in place during normal repository workflow:

- `enforce_snapshot_immutability` / `enforce_snapshot_version_immutability` —
  block status changes to `digital_twin_snapshots` / `digital_twin_snapshot_versions`
  once `status = 'published'`
- `enforce_scenario_baseline_immutability` / `enforce_scenario_baseline_version_immutability` —
  block status changes to `scenario_baselines` / `scenario_baseline_versions`
  once `status = 'published'`
- `enforce_definition_immutability` / `enforce_definition_version_immutability` —
  block `digital_twin_definitions` / `digital_twin_definition_versions`
  reverting from `active`/`retired` to `draft`
- `enforce_publication_transition` — enforces the valid `dt_publication_packages`
  lifecycle state machine (`draft→ready→dispatched→{acknowledged,rejected,revoked}`,
  `acknowledged→revoked`); any other transition is rejected

**Design note (fixed during this build):** the initial draft of migration
0062 placed `digital_twin_definition_versions`, `digital_twin_snapshot_versions`,
and `scenario_baseline_versions` in the unconditional append-only list. This
contradicted their own table comments ("immutable once published/active")
and broke the repositories' `validateVersion`/`publishSnapshot`/`publishBaseline`
methods, which need to update the version row's own `status` column as part
of normal lifecycle transitions. Caught by the live integration test suite
before this build was reported complete; fixed by giving these three tables
dedicated guards (narrowly scoped to the status column, mirroring their
header tables) instead of blanket append-only enforcement.

**Operational implication:** because the append-only triggers apply to every
role and cascade via `ON DELETE RESTRICT` up through parent rows,
`business_digital_twin` evidence rows — and any tenant/business row they
reference — cannot be deleted once created. Test fixtures use disposable
per-test identifiers; the disposable test database is the reset mechanism,
not per-suite cleanup.

## Outbox Events

16 required events, each backed by a `SECURITY DEFINER` function using the
established `emit_outbox_event` helper: `dt.intake.received`,
`dt.intake.accepted`, `dt.intake.rejected`, `dt.definition.published`,
`dt.instance.created`, `dt.instance.status_changed`, `dt.snapshot.created`,
`dt.snapshot.validated`, `dt.snapshot.published`, `dt.calibration.started`,
`dt.calibration.completed`, `dt.calibration.failed`,
`dt.validation.completed`, `dt.scenario_baseline.created`,
`dt.scenario_baseline.published`, `dt.data.published`. `dt.data.published`
rejects target layers outside `{simulation}`.

## BI-to-DT and DT-to-SIM Handoff Contracts

- `packages/handoff-contracts/src/bi-to-dt.ts` — strict versioned (`1.0.0`)
  contract replacing the placeholder. Accepts only `ready`/`dispatched` BI
  publication packages; validates ownership, period ordering,
  serializability, and forbids embedded Simulation/ADI/approval content.
- `packages/handoff-contracts/src/dt-to-sim.ts` — strict versioned (`1.0.0`)
  contract replacing the placeholder. Accepts only a published scenario
  baseline built from a published snapshot with uncertainty assigned to
  numeric variables; forbids embedded recommendation/approval/decision
  content. BUILD-12 does not implement Simulation persistence (Stage 2F,
  BUILD-13) — the contract carries governed twin state only.

## Repository Adapters (`packages/database/src/repositories/dt/`)

| Repository | Coverage |
|---|---|
| `DTIntakeRepository` | intake, source refs, lifecycle transitions |
| `DigitalTwinDefinitionRepository` | definitions and versions, activation |
| `DigitalTwinInstanceRepository` | instances and versions, status transitions |
| `DigitalTwinSnapshotRepository` | snapshots, values, evidence, validate/publish/supersede |
| `StateVariableRepository` | state variable definitions, values, quality |
| `TwinEntityRepository` | entities, relationships, entity graph |
| `TwinAssumptionConstraintRepository` | assumptions, constraints, evaluations |
| `TwinCalibrationRepository` | calibration runs, inputs, results |
| `TwinValidationRepository` | validation runs, results, issues |
| `ScenarioBaselineRepository` | baselines and versions, validate/publish |
| `DTPublicationPackageRepository` | insight packages, publication lifecycle |
| `DTComponentRegistryRepository` | component registry, deployment, rollback |

All repositories require a `TenantContext`, execute inside
`withTenantTransaction`, and use `parseFloat(String(...))` for `numeric`
columns per the established Stage 2C convention. Every method that opens its
own transaction is never called from inside another `withTenantTransaction`
callback (the BUILD-09-discovered nested-transaction pitfall) — event-emitting
writes are inlined on the shared `client` parameter instead.

## Validation Results (verified at freeze, 2026-07-22)

Live database: local PostgreSQL 16, database `infinicus_test`. Full
empty-database installation of migrations 0001→0062, verified from a
freshly dropped/recreated database.

| Check | Result |
|---|---|
| Structural tests (`migration-stage2e.test.ts`) | 184/184 pass |
| Live integration tests (`dt-repositories.integration.test.ts`) | 157/157 pass (1 intentional skip-guard) |
| Full `@infinicus/database` suite | 1043/1043 pass (2 intentional skip-guards); run twice against the same database with identical results |
| Contract tests (`bi-to-dt.contract.test.ts` + `dt-to-sim.contract.test.ts`) | 45/45 pass (22 + 23) |
| Full `@infinicus/handoff-contracts` suite | 90/90 pass |
| Lint | clean (0 errors; pre-existing `no-console` warnings in `client.ts`/`migrate.ts` unrelated to this build) |
| Typecheck | clean |
| Build | clean |
| Live schema | 51 tables, 51 RLS-forced, 338 indexes, 55 triggers, 25 functions |
| Frozen migration integrity | 0001–0049 byte-identical (`git diff` clean) |
| Migration rerun idempotency | all 62 migrations report `skip` on second run |
| Root layer regression (DA+ADI+ABA+BI+DT+OM+CL `.test.mjs`) | 180/180 pass |
| Monorepo ADI layer regression | 106/106 pass |

The 157 live DT integration tests cover: fail-closed RLS, cross-tenant
rejection, BI intake and idempotency, definition/instance/snapshot/
state-variable/entity/assumption/constraint/calibration/validation/
scenario-baseline lifecycle, append-only enforcement, publish-once
immutability on snapshot/baseline/definition version rows, publication
lifecycle and idempotent replay, uncertainty/confidence bounds, outbox
atomicity across all 16 events, and transaction rollback.

## Known Limitations

- Simulation persistence (Stage 2F) is not included — DT→SIM handoff
  contract is complete, but no `simulation` schema/repositories exist yet.
- ADI/ABA/OM/CL persistence is not included.
- BUILD-10 browser platform assembly is a separate track and is unaffected.
- No external message broker or production deployment was added; the
  outbox pattern remains the durability boundary.

## What Remains

- Stage 2F (Simulation persistence, BUILD-13) or later database work.
- Not started in Stage 2E.
