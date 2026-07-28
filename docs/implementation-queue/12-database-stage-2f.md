# INFINICUS DATABASE STAGE 2F — SIMULATION IMPLEMENTATION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

This prompt is implementation-ready. Do not redesign the architecture. Inspect the repository, align to existing conventions, implement only this stage, validate, freeze migrations, and report.

Read and obey:

1. `CLAUDE.md`
2. Database Stages 2A–2E completion reports
3. Frozen migration manifest
4. `INFINICUS-SIMULATION-EXTRACTION-SPECIFICATION.md`
5. Existing INFINICUS Engine v3 implementation
6. Existing Simulation characterization/golden tests, if present
7. Platform Event Catalogue
8. Layer Handoff Contracts
9. Existing database, transaction, RLS, outbox, repository, and PostgreSQL test conventions

## Objective

Implement Database Stage 2F only:

```text
Simulation persistence
```

Canonical schema:

```text
simulation
```

Use the next actual migration number after Stage 2E. Do not guess it.

Do not rewrite Engine v3 logic in this stage. Persist and expose Simulation inputs, runs, evidence, and outputs while preserving compatibility.

## Frozen migration rule

All migrations through Stage 2E are frozen.

For defects:

```text
document
→ forward-only correction migration
→ preserve checksums
```

## Required table groups

### A. Simulation requests and lifecycle

```text
simulation_requests
simulation_request_versions
simulation_request_status_history
simulation_priorities
simulation_cancellations
```

Statuses:

```text
draft
requested
queued
validating
ready
running
completed
failed
cancelled
expired
revoked
```

### B. Input packages

```text
simulation_input_packages
simulation_input_package_versions
simulation_input_items
simulation_input_sources
simulation_input_lineage
simulation_input_validation_records
```

Source layers:

```text
business_intelligence
business_digital_twin
business_operations
user_input
system_default
```

### C. Assumptions and variables

```text
simulation_assumption_sets
simulation_assumption_set_versions
simulation_assumptions
simulation_variable_definitions
simulation_variable_versions
simulation_variable_values
```

### D. Distributions and correlations

```text
simulation_distributions
simulation_distribution_versions
simulation_distribution_parameters
simulation_correlation_sets
simulation_correlations
```

Supported distribution types must be constrained and versioned.

### E. Scenario sets

```text
simulation_scenario_sets
simulation_scenario_set_versions
simulation_scenarios
simulation_scenario_variables
simulation_scenario_constraints
```

### F. Execution runs and batches

```text
simulation_runs
simulation_run_attempts
simulation_batches
simulation_batch_items
simulation_worker_claims
simulation_run_status_history
```

### G. Randomness and reproducibility

```text
simulation_seed_records
simulation_engine_versions
simulation_runtime_configs
simulation_reproducibility_records
```

Every completed run must record deterministic seed and engine version.

### H. Projections

```text
simulation_projection_sets
simulation_projection_series
simulation_projection_points
simulation_projection_intervals
simulation_projection_summaries
```

Support revenue, cost, cash flow, demand, capacity, workforce, inventory, and other registered projection types.

### I. Risk and uncertainty

```text
simulation_risk_models
simulation_risk_model_versions
simulation_risk_events
simulation_risk_results
simulation_uncertainty_records
simulation_confidence_records
```

### J. Sensitivity and stress tests

```text
simulation_sensitivity_runs
simulation_sensitivity_inputs
simulation_sensitivity_results
simulation_stress_test_definitions
simulation_stress_test_versions
simulation_stress_test_runs
simulation_stress_test_results
```

### K. Comparisons and verdict support

```text
simulation_comparison_runs
simulation_comparison_results
simulation_verdict_support
simulation_verdict_evidence
simulation_limitations
```

Verdict support values:

```text
go
modify
stop
inconclusive
```

This is decision evidence, not approval.

### L. Result packages and publication

```text
simulation_result_packages
simulation_result_package_versions
simulation_result_items
simulation_publication_packages
simulation_publication_package_versions
simulation_publication_items
simulation_handoff_receipts
simulation_handoff_acknowledgements
simulation_handoff_rejections
```

Target layer:

```text
ai_decision_intelligence
```

### M. Registry, deployment, and rollback

```text
simulation_component_registry
simulation_component_versions
simulation_deployments
simulation_deployment_status_history
simulation_rollbacks
```

## Required relationships

Implement:

```text
request → input package
input package → BI/DT source packages
request → assumption set
request → variable versions
request → scenario set
run → request and engine version
run → seed
run → batch
run → projections
run → risk results
run → sensitivity/stress outputs
run → verdict support
result package → completed run
publication package → result package
handoff → publication package version
deployment → component version
```

No orphan outputs.

## Engine v3 compatibility rules

Persist:

```text
engine name
engine version
compatibility mode
seed
90-day horizon where applicable
input checksum
output checksum
runtime configuration
```

Completed v3-compatible runs must be reproducible.

Do not silently change Monte Carlo behavior.

## Data rules

Use:

```text
UUID
TIMESTAMPTZ
NUMERIC for money and precise scores
BIGINT where large iteration counts require it
JSONB only for genuinely variable payloads
```

Scores must satisfy:

```text
0 <= score <= 1
```

Intervals require:

```text
lower_bound <= expected_value <= upper_bound
```

## Suggested migration grouping

Use the next actual migration number:

```text
<next>_simulation_schema.sql
<next+1>_simulation_requests_and_inputs.sql
<next+2>_simulation_assumptions_variables_distributions.sql
<next+3>_simulation_scenarios.sql
<next+4>_simulation_runs_batches_reproducibility.sql
<next+5>_simulation_projections.sql
<next+6>_simulation_risk_uncertainty.sql
<next+7>_simulation_sensitivity_stress.sql
<next+8>_simulation_comparisons_verdict_support.sql
<next+9>_simulation_results_publication_handoffs.sql
<next+10>_simulation_registry_deployment.sql
<next+11>_simulation_indexes.sql
<next+12>_simulation_rls.sql
<next+13>_simulation_triggers.sql
<next+14>_simulation_event_functions.sql
```

## Constraints and indexes

Create named constraints for:

- valid states;
- positive versions, horizons, iteration counts, batch sizes;
- valid distributions;
- valid probability and confidence ranges;
- valid intervals;
- unique request idempotency keys;
- unique run attempts;
- unique result and publication versions;
- valid target layer;
- unique engine/version/checksum combinations where appropriate.

Index tenant, workspace, business, request, run, status, engine version, seed, scenario, timestamps, result package, publication package, correlation, handoff, deployment, and active/current versions.

## RLS

Enable RLS on all tenant-owned tables.

Enforce tenant, workspace, and business scope. Missing context fails closed. Application role cannot bypass RLS.

## Immutability

Immutable after completion/publication:

```text
input package versions
assumption versions used by runs
scenario versions used by runs
engine version references
seed records
completed runs
projections
risk/sensitivity/stress outputs
verdict evidence
result packages
publication packages
handoff acknowledgements
deployment evidence
```

## Event functions

Create transaction-safe wrappers or repository helpers for canonical equivalents of:

```text
sim.simulation.requested
sim.simulation.started
sim.simulation.completed
sim.simulation.failed
sim.result.published
```

Preserve tenant, workspace, business, aggregate, event version, correlation, causation, and provenance.

Reuse the canonical outbox.

## Repositories

Implement at minimum:

```text
SimulationRequestRepository
SimulationInputRepository
SimulationAssumptionRepository
SimulationScenarioRepository
SimulationRunRepository
SimulationProjectionRepository
SimulationRiskRepository
SimulationSensitivityRepository
SimulationStressTestRepository
SimulationResultRepository
SimulationPublicationRepository
SimulationHandoffRepository
SimulationDeploymentRepository
```

## Live PostgreSQL 16 tests

Cover:

- request lifecycle and idempotency;
- input package source validation;
- assumptions, variables, distributions, correlations;
- scenarios and constraints;
- run attempts, batches, claims, stale-claim recovery;
- deterministic seed and reproducibility records;
- projections and intervals;
- risk, confidence, sensitivity, stress tests;
- comparisons and verdict support;
- completed result immutability;
- publication and handoff;
- event outbox atomicity;
- registry, deployment, rollback;
- tenant/workspace/business isolation;
- fail-closed RLS;
- rollback atomicity.

Target at least 120 meaningful live integration tests.

## Structural tests

Verify schema, tables, columns, constraints, FKs, indexes, RLS, policies, triggers, event functions, repositories, exports, migration count, and frozen checksums.

## Documentation

Create:

```text
docs/database/stage-2f-simulation.md
docs/database/simulation-schema.md
docs/database/simulation-reproducibility.md
docs/database/simulation-engine-v3-compatibility.md
docs/database/simulation-events.md
docs/database/simulation-repositories.md
docs/database/simulation-rls.md
docs/database/simulation-test-plan.md
```

Update `packages/database/README.md`.

## Validation

```bash
pnpm install
pnpm workspace:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @infinicus/database test:integration
```

Apply all migrations from empty PostgreSQL 16 and rerun for idempotency.

## Prohibited work

Do not implement ADI, ABA, OM, or CL schemas; frontend; event relay; Simulation engine rewrite; external providers; or edits to frozen migrations.

## Stop condition

Stop after schema, repositories, RLS, events, live tests, reproducibility persistence, v3 compatibility evidence, idempotency, documentation, and migration freeze are complete.

Do not begin Stage 2G.

## Completion report

Return exact migration range, files, totals, validation results, v3 compatibility status, reproducibility status, security results, limitations, and:

```text
Next recommended task:
Database Stage 2G — AI Decision Intelligence
```
