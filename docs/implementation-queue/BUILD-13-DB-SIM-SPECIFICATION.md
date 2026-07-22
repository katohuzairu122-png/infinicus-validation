# BUILD-13 SPECIFICATION — DATABASE STAGE 2F SIMULATION PERSISTENCE

- **Build ID:** BUILD-13
- **Layer:** DB-SIM
- **Database stage:** 2F
- **Name:** Simulation Persistence
- **Dependency:** BUILD-12
- **Browser dependency:** none
- **Specification status:** FROZEN
- **Implementation status:** BLOCKED until BUILD-12 completes
- **Frozen migration baseline:** Stage 2E final migration
- **Migration range:** determine the first free contiguous range after repository inspection; never guess
- **Schema:** `simulation`

## 1. Objective

Implement the complete Simulation Persistence database tier using the conventions frozen by Stages 2A–2E.

Preserve Engine v3 semantics, 500-run Monte Carlo behavior, 90-day default horizon, deterministic fixtures, probabilistic evidence, and strict separation between outcome estimation and recommendation authority.

The build must include schema migrations, strict TypeScript repositories, handoff contracts, outbox events, forced RLS, append-only evidence/history, lifecycle guards, structural tests, live PostgreSQL integration tests, documentation, and a completion report.

## 2. Entry gate

Before source changes:

1. verify `BUILD-12` is completed;
2. verify every earlier migration is byte-identical;
3. inspect the migration directory and freeze the next free range;
4. inspect the predecessor stage schema, publication package, repositories, tests, events, and handoff contract;
5. verify no competing schema or migration exists;
6. record the specification SHA-256 in queue metadata.

Stop on any mismatch.

## 3. Required table groups

### A. Intake and lineage

```text
simulation_intake_packages
simulation_intake_package_versions
simulation_intake_source_references
simulation_intake_status_history
```

### B. Models and versions

```text
simulation_models
simulation_model_versions
simulation_model_parameters
simulation_model_constraints
```

### C. Scenario definitions

```text
simulation_scenarios
simulation_scenario_versions
simulation_scenario_inputs
simulation_scenario_assumptions
simulation_scenario_constraints
```

### D. Run lifecycle

```text
simulation_requests
simulation_runs
simulation_run_status_history
simulation_run_inputs
```

### E. Monte Carlo evidence

```text
simulation_iterations
simulation_iteration_summaries
simulation_distributions
simulation_percentiles
```

### F. Results

```text
simulation_results
simulation_result_versions
simulation_result_metrics
simulation_result_evidence
```

### G. Risk and sensitivity

```text
simulation_risk_results
simulation_sensitivity_runs
simulation_sensitivity_results
simulation_failure_modes
```

### H. Comparisons

```text
scenario_comparison_runs
scenario_comparison_members
scenario_comparison_results
```

### I. Validation and calibration

```text
simulation_validation_runs
simulation_validation_results
simulation_calibration_runs
simulation_calibration_results
```

### J. Publication

```text
simulation_insight_packages
simulation_insight_package_versions
simulation_publication_packages
simulation_publication_events
```

### K. Registry and deployment

```text
simulation_component_registry
simulation_component_registry_versions
simulation_deployments
simulation_deployment_rollbacks
```


Minimum table count: **44**. Supporting tables may be added only for verified referential integrity, lifecycle, evidence, or repository-convention requirements.

## 4. RLS and scope

Every `simulation` table must:

```text
ENABLE ROW LEVEL SECURITY
FORCE ROW LEVEL SECURITY
```

Use the Stage 2D/2E null-safe fail-closed predicate.

Validate:

- tenant isolation;
- workspace isolation;
- business isolation where applicable;
- missing-context zero-row behavior;
- cross-scope write rejection;
- explicit service transaction context;
- no normal repository reliance on unrestricted BYPASSRLS.

## 5. Immutability

All evidence, status history, results, observations, audit, publication events, release history, deployment history, and rollback history are append-only.

Released, published, completed, approved, rejected, observed, or historical versions must be superseded by new rows, not edited.

Use shared `forbid_mutation()` where compatible and dedicated lifecycle guards where state machines require them.

## 6. Handoff contracts

### Inbound

Complete or verify:

```text
infinicus-platform/packages/handoff-contracts/src/dt-to-sim.ts
```

### Outbound

Complete:

```text
infinicus-platform/packages/handoff-contracts/src/sim-to-adi.ts
```

Both contracts must be strict versioned `LayerHandoff` contracts and enforce:

- tenant/workspace/business ownership;
- correlation and causation;
- source package and artifact IDs;
- version and status eligibility;
- effective/recorded time;
- evidence and lineage;
- idempotency;
- serializability;
- payload bounds;
- credential and executable-content rejection;
- authority boundaries.

Do not accept draft, failed, rejected, revoked, stale, unsupported, cross-scope, or malformed inputs.

## 7. Events

Add or reuse canonical events:

```text
sim.intake.received
sim.scenario.created
sim.run.requested
sim.run.started
sim.run.completed
sim.run.failed
sim.result.published
sim.risk.calculated
sim.sensitivity.completed
sim.data.published
```

Do not create duplicate synonyms for existing event names.

All aggregate changes and outbox inserts must be atomic on one shared transaction client. Nested transactions are prohibited.

## 8. Repositories

Create under:

```text
infinicus-platform/packages/database/src/repositories/simulation/
```

Required repositories:

- `SimulationIntakeRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `SimulationModelRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `SimulationScenarioRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `SimulationRunRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `SimulationResultRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `SimulationRiskRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `SimulationSensitivityRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `ScenarioComparisonRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `SimulationValidationRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `SimulationPublicationRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `SimulationComponentRegistryRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.

Each repository must use strict TypeScript, controlled errors, explicit scope, immutable historical records, idempotency where applicable, and transactional outbox emission.

## 9. Security

Mandatory:

- plain serializable inputs only;
- reject cycles, functions, symbols, BigInt, DOM/global references, and class instances;
- reject `__proto__`, `prototype`, and `constructor` keys;
- reject credential-like keys and values;
- no secrets in events, logs, audit, or errors;
- bounded strings, arrays, and canonical JSON;
- schema validation before persistence;
- fail-closed scope validation;
- redacted controlled errors.

Maximum canonical handoff payload: **512 KiB**.

## 10. Controlled errors

Create repository-aligned controlled errors for:

```text
intake validation
scope mismatch
not found
state conflict
immutable artifact
duplicate artifact
unsupported version
invalid lifecycle transition
payload too large
credential content
evidence missing
lineage invalid
publication state conflict
```

Use exact names consistent with the existing database package.

## 11. Tests

Minimum new structural tests: **150**.

Minimum new live PostgreSQL integration tests: **120**.

Minimum inbound contract tests: **20**.

Minimum outbound contract tests: **20**.

Required live coverage:

- empty-database installation through the final migration;
- migration rerun/idempotency;
- all objects, constraints, indexes, functions, triggers, and exports;
- RLS enabled and forced on every table;
- fail-closed no-context reads;
- cross-tenant/workspace/business rejection;
- append-only UPDATE and DELETE rejection;
- every aggregate lifecycle;
- invalid transition rejection;
- versioning and supersession;
- evidence and lineage;
- publication lifecycle;
- registry/deployment/rollback;
- atomic outbox;
- rollback on outbox failure;
- idempotency;
- payload and credential rejection;
- two consecutive full database-package runs with identical results.

Regression gates:

```text
root browser regression
ADI source regression
handoff-contract suite
full database package
lint
typecheck
build
frozen migration hashes
git diff --check
```

## 12. Documentation

Create:

```text
infinicus-platform/docs/database-stage-2f-simulation.md
```

Document schema groups, migrations, RLS, immutability, repositories, events, handoffs, tests, limitations, and the next-stage boundary.

## 13. Frozen-file protection

Do not modify:

- any earlier migration;
- earlier frozen specifications or reports;
- completed browser layer blocks or bundles;
- Engine v3 Monte Carlo core;
- predecessor handoff semantics except a test-proven compatibility fix;
- unrelated packages.

## 14. Out of scope

Do not implement:

- browser platform assembly;
- later database stages;
- external brokers;
- production deployment;
- frontend redesign;
- unrelated refactors;
- authority owned by another layer.

## 15. Completion conditions

The build is complete only when:

1. schema and every required group exist;
2. table minimum is met;
3. all tables use enabled and forced RLS;
4. append-only and lifecycle guards pass live tests;
5. inbound and outbound handoffs are complete;
6. events and atomic outbox wrappers exist;
7. all repositories and exports exist;
8. structural/live/contract minimums pass;
9. all regressions pass;
10. earlier migrations remain byte-identical;
11. documentation and completion report exist;
12. queue state is updated;
13. the next build is not started.

## 16. Queue transition

```text
BUILD-13: blocked -> ready after BUILD-12 completion
BUILD-13: ready -> in_progress -> completed
currentReadyBuild: next authoritative build only after separate verification
```

Do not automatically implement or ready the next stage.

## 17. Completion report

```text
BUILD-13 COMPLETION REPORT — DB-SIM: DATABASE STAGE 2F SIMULATION PERSISTENCE

Build ID:
Layer:
Date:
Branch:
Specification:
Specification SHA-256:
Status:

WHAT WAS BUILT
MIGRATION RANGE
FROZEN MIGRATION VERIFICATION
SCHEMA OBJECTS
TABLE GROUPS
RLS
APPEND-ONLY ENFORCEMENT
LIFECYCLE GUARDS
INBOUND HANDOFF
OUTBOUND HANDOFF
EVENTS
REPOSITORIES
SECURITY
STRUCTURAL TESTS
LIVE INTEGRATION TESTS
CONTRACT TESTS
REGRESSION RESULTS
EMPTY-DATABASE INSTALL
MIGRATION IDEMPOTENCY
OUTBOX ATOMICITY
TRANSACTION ROLLBACK
FILES CREATED
FILES MODIFIED
DOCUMENTATION
OUT-OF-SCOPE CONFIRMATION
KNOWN LIMITATIONS
QUEUE TRANSITION

Commit:
Branch:
PR:
Next build:
```
