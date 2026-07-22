# BUILD-12 SPECIFICATION — DATABASE STAGE 2E BUSINESS DIGITAL TWIN PERSISTENCE

- **Build ID:** BUILD-12
- **Layer:** DB-DT
- **Database stage:** 2E
- **Name:** Business Digital Twin Persistence
- **Dependency:** BUILD-09 DB-BI completion
- **Browser dependency:** none
- **Specification status:** FROZEN
- **Implementation status:** READY after repository verification
- **Frozen migration baseline:** `0001`–`0049`
- **Expected migration range:** determine the first free contiguous range after repository inspection; do not guess
- **Purpose:** Implement the full Business Digital Twin persistence tier, repositories, events, BI→DT handoff completion, tests, and documentation without requiring BUILD-10 browser-platform assembly.

---

## 1. Stage objective

Create a production-oriented `business_digital_twin` PostgreSQL schema that persists:

1. twin definitions and versions;
2. business-state snapshots;
3. state variables and values;
4. entities and relationships;
5. assumptions and constraints;
6. calibration and validation records;
7. scenario baselines;
8. uncertainty and confidence;
9. evidence and lineage;
10. publication packages;
11. component registry, deployment, and rollback history.

The stage must accept governed BI publication inputs and produce DT publication outputs suitable for Simulation.

---

## 2. Entry conditions

Implementation may start only when:

- BUILD-09 is completed;
- migrations `0001`–`0049` are byte-identical to the frozen baseline;
- the next free migration number is confirmed by directory inspection;
- Stage 2D conventions are inspected;
- `business_intelligence.bi_publication_packages` and related BI publication objects are verified;
- `packages/handoff-contracts/src/bi-to-dt.ts` is inspected;
- existing event-contract and outbox conventions are inspected;
- existing repository and integration-test patterns are inspected.

BUILD-10 is not a dependency.

---

## 3. Schema

Create:

```text
business_digital_twin
```

All tables must use repository-standard primary keys, timestamps, tenancy columns, foreign keys, indexes, comments, and migration self-registration.

---

## 4. Required table groups

### A. Intake and lineage

```text
dt_intake_packages
dt_intake_package_versions
dt_intake_source_references
dt_intake_processing_status_history
```

Purpose:

- receive BI→DT handoffs;
- preserve exact source package identity;
- retain versions and lineage;
- track acceptance, rejection, processing, and failure.

Required statuses:

```text
received
validated
accepted
processing
completed
rejected
failed
```

History tables are append-only.

---

### B. Twin definitions

```text
digital_twin_definitions
digital_twin_definition_versions
digital_twin_definition_components
digital_twin_definition_relationships
```

Purpose:

- define the canonical shape of a business twin;
- version structural definitions;
- map components and relationships;
- preserve immutable released versions.

Definition statuses:

```text
draft
validated
active
superseded
retired
```

Released versions are immutable.

---

### C. Twin instances

```text
digital_twin_instances
digital_twin_instance_versions
digital_twin_instance_status_history
```

Purpose:

- represent tenant/workspace/business-specific twin instances;
- separate reusable definition from instantiated business state;
- support controlled lifecycle and supersession.

Instance statuses:

```text
initializing
active
degraded
stale
suspended
retired
failed
```

Status history is append-only.

---

### D. State snapshots

```text
digital_twin_snapshots
digital_twin_snapshot_versions
digital_twin_snapshot_values
digital_twin_snapshot_evidence
digital_twin_snapshot_status_history
```

Purpose:

- persist immutable point-in-time business state;
- attach metrics, findings, assumptions, constraints, evidence, and confidence;
- support effective-time and recorded-time semantics.

Snapshot statuses:

```text
draft
validated
published
superseded
rejected
```

Published snapshots are immutable.

---

### E. State variables

```text
state_variable_definitions
state_variable_definition_versions
state_variable_values
state_variable_value_quality
```

Variable categories:

```text
financial
operational
customer
market
resource
risk
capacity
behavioral
regulatory
custom
```

Value types:

```text
number
integer
boolean
string
date
timestamp
percentage
currency
enum
json
```

Definitions must include unit, range, allowed values, nullability, derivation method, and source classification.

---

### F. Entities and relationships

```text
twin_entities
twin_entity_versions
twin_relationships
twin_relationship_versions
```

Purpose:

- represent customers, products, locations, channels, resources, teams, suppliers, and other governed business entities;
- preserve directed relationship semantics;
- support effective dating and versioning.

No destructive mutation of historical versions.

---

### G. Assumptions and constraints

```text
twin_assumptions
twin_assumption_versions
twin_constraints
twin_constraint_versions
twin_constraint_evaluations
```

Assumption sources:

```text
observed
declared
derived
inferred
external
```

Constraint operators:

```text
eq
neq
lt
lte
gt
gte
between
in
not_in
contains
```

Constraint evaluations are append-only evidence.

---

### H. Calibration and validation

```text
twin_calibration_runs
twin_calibration_inputs
twin_calibration_results
twin_validation_runs
twin_validation_results
twin_validation_issues
```

Calibration statuses:

```text
requested
running
completed
failed
cancelled
```

Validation outcomes:

```text
passed
passed_with_warnings
failed
```

Completed calibration and validation evidence is immutable.

---

### I. Uncertainty and confidence

```text
twin_uncertainty_models
twin_uncertainty_model_versions
twin_uncertainty_assignments
twin_confidence_scores
```

Purpose:

- represent ranges, distributions, confidence, freshness, reliability, and uncertainty;
- avoid storing false precision;
- provide Simulation-ready uncertainty metadata.

Distribution types:

```text
fixed
uniform
normal
lognormal
triangular
beta
empirical
categorical
```

---

### J. Scenario baselines

```text
scenario_baselines
scenario_baseline_versions
scenario_baseline_inputs
scenario_baseline_constraints
```

Purpose:

- create governed DT outputs for Simulation;
- preserve the exact snapshot, variables, assumptions, constraints, and uncertainty used.

Baseline statuses:

```text
draft
validated
ready
published
superseded
rejected
```

Published baselines are immutable.

---

### K. Publication

```text
dt_insight_packages
dt_insight_package_versions
dt_publication_packages
dt_publication_events
```

Purpose:

- package DT snapshots and scenario baselines for downstream Simulation;
- retain package versions and publication lifecycle;
- emit governed outbox events.

Publication statuses:

```text
draft
ready
dispatched
acknowledged
rejected
revoked
```

Lifecycle transitions must be guarded.

---

### L. Registry and deployment

```text
dt_component_registry
dt_component_registry_versions
dt_deployments
dt_deployment_rollbacks
```

Purpose:

- register DT components and models;
- version capabilities and interfaces;
- track deployment and rollback.

Deployment and rollback history is append-only.

---

## 5. Minimum table count

The final implementation must contain at least 48 tables across the required groups.

Claude may add supporting tables only when required by repository conventions or a verified referential-integrity need.

Do not reduce any required group.

---

## 6. RLS

Every `business_digital_twin` table must:

```text
ENABLE ROW LEVEL SECURITY
FORCE ROW LEVEL SECURITY
```

Use the Stage 2D null-safe fail-closed predicate.

Required isolation dimensions:

```text
tenant_id
workspace_id
business_id where applicable
```

Tests must prove:

- missing context returns zero rows;
- cross-tenant reads and writes fail;
- same-tenant cross-workspace reads and writes fail;
- business mismatch fails;
- privileged services use explicitly authorized transaction context;
- normal repositories do not depend on unrestricted BYPASSRLS behavior.

---

## 7. Immutability and append-only rules

Append-only enforcement is required for:

```text
all status-history tables
all evidence tables
all calibration inputs/results
all validation results/issues
all confidence scores
all constraint evaluations
all publication events
all deployment rollback records
all released or published version tables
```

Use the existing shared `forbid_mutation()` pattern where compatible.

Create dedicated transition or immutability guards for:

```text
published digital_twin_snapshots
published scenario_baselines
dt_publication_packages
active/released definition versions
```

Published and historical records must be superseded, not edited.

---

## 8. BI→DT handoff

Complete:

```text
infinicus-platform/packages/handoff-contracts/src/bi-to-dt.ts
```

Contract version:

```text
1.0.0
```

The contract must accept only BI publication packages in the actual repository-approved state.

Required ownership and lineage:

```text
tenantId
workspaceId
businessId
biPublicationPackageId
insightPackageId
insightVersion
correlationId
causationId
source references
evidence references
effective period
schema version
idempotency key
```

Required BI content:

```text
metrics
findings
risks
constraints
assumptions
quality
freshness
reliability
lineage
```

Reject:

- draft or failed BI packages;
- missing ownership;
- invalid period ordering;
- missing evidence;
- cross-scope payloads;
- malformed metrics;
- unsupported versions;
- credential-like fields or values;
- functions, symbols, BigInt, class instances, global references, DOM nodes, cycles, executable content;
- embedded Simulation output;
- embedded ADI recommendations;
- approval or execution content.

The contract must produce a strict `LayerHandoff`.

Add comprehensive unit tests.

---

## 9. DT→SIM handoff

Complete:

```text
infinicus-platform/packages/handoff-contracts/src/dt-to-sim.ts
```

Contract version:

```text
1.0.0
```

Accept only published, Simulation-ready DT publication packages or scenario baselines.

Required content:

```text
tenant/workspace/business ownership
digital twin instance ID
snapshot ID and version
scenario baseline ID and version
objective
variables
assumptions
constraints
uncertainty assignments
evidence references
quality/confidence
effective time
correlation
causation
idempotency key
```

Reject:

- draft/unvalidated baselines;
- stale or rejected snapshots;
- missing uncertainty for required probabilistic variables;
- invalid ownership;
- missing evidence;
- unsupported versions;
- recommendation or approval fields;
- credentials or executable content.

Do not implement Simulation persistence in BUILD-12.

---

## 10. Events

Add canonical DT event types to `LayerEventType`.

Minimum required:

```text
dt.intake.received
dt.intake.accepted
dt.intake.rejected
dt.definition.published
dt.instance.created
dt.instance.status_changed
dt.snapshot.created
dt.snapshot.validated
dt.snapshot.published
dt.calibration.started
dt.calibration.completed
dt.calibration.failed
dt.validation.completed
dt.scenario_baseline.created
dt.scenario_baseline.published
dt.data.published
```

If the repository already contains equivalent canonical names, reuse them instead of duplicating.

Create atomic outbox wrapper functions for the events required by repositories.

---

## 11. Repositories

Create under:

```text
infinicus-platform/packages/database/src/repositories/dt/
```

Required strict-TypeScript repositories:

```text
DTIntakeRepository
DigitalTwinDefinitionRepository
DigitalTwinInstanceRepository
DigitalTwinSnapshotRepository
StateVariableRepository
TwinEntityRepository
TwinAssumptionConstraintRepository
TwinCalibrationRepository
TwinValidationRepository
ScenarioBaselineRepository
DTPublicationPackageRepository
DTComponentRegistryRepository
```

Minimum responsibilities:

### `DTIntakeRepository`

```text
receivePackage
acceptPackage
rejectPackage
markProcessing
completePackage
failPackage
getById
getBySourcePackage
```

### `DigitalTwinDefinitionRepository`

```text
createDefinition
createVersion
validateVersion
activateVersion
supersedeVersion
getActiveVersion
```

### `DigitalTwinInstanceRepository`

```text
createInstance
createVersion
transitionStatus
getById
getActiveForBusiness
```

### `DigitalTwinSnapshotRepository`

```text
createSnapshot
addValue
addEvidence
validateSnapshot
publishSnapshot
supersedeSnapshot
getById
getPublishedForInstance
```

### `StateVariableRepository`

```text
createDefinition
createVersion
recordValue
recordQuality
getDefinition
listValues
```

### `TwinEntityRepository`

```text
createEntity
createEntityVersion
createRelationship
createRelationshipVersion
getEntityGraph
```

### `TwinAssumptionConstraintRepository`

```text
createAssumption
createAssumptionVersion
createConstraint
createConstraintVersion
evaluateConstraint
listForSnapshot
```

### `TwinCalibrationRepository`

```text
createRun
addInput
startRun
completeRun
failRun
getRun
```

### `TwinValidationRepository`

```text
createRun
recordResult
recordIssue
completeRun
getRun
```

### `ScenarioBaselineRepository`

```text
createBaseline
createVersion
addInput
addConstraint
validateBaseline
publishBaseline
getPublishedForSnapshot
```

### `DTPublicationPackageRepository`

```text
createPackage
createVersion
markReady
dispatch
acknowledge
reject
revoke
getById
```

### `DTComponentRegistryRepository`

```text
registerComponent
createVersion
activateVersion
recordDeployment
recordRollback
getActiveVersion
```

All state changes and outbox writes must share one transaction client.

No nested transactions.

---

## 12. Database exports and documentation

Update the database package exports to include all DT repositories and types.

Create:

```text
infinicus-platform/docs/database-stage-2e-business-digital-twin.md
```

Document:

- schema;
- migration range;
- table groups;
- RLS;
- immutability;
- repositories;
- events;
- handoffs;
- limitations;
- next stage boundary.

---

## 13. Security

Mandatory:

- secret and credential rejection;
- bounded JSON payloads;
- plain serializable data;
- prototype-pollution protection;
- no executable content;
- no raw credentials in errors, logs, audit, or events;
- redacted controlled errors;
- input-size limits;
- schema validation before persistence;
- scope validation before every write;
- fail-closed defaults.

Maximum canonical serialized handoff size:

```text
512 KiB
```

Maximum single free-text field:

```text
8,000 characters
```

Maximum collection size:

```text
1,000 entries unless repository evidence requires a lower bound
```

---

## 14. Controlled errors

Use repository-aligned names. Minimum:

```text
DTIntakeValidationError
DTIntakeScopeMismatchError
DigitalTwinDefinitionNotFoundError
DigitalTwinDefinitionStateConflictError
DigitalTwinInstanceNotFoundError
DigitalTwinInstanceStateConflictError
DigitalTwinSnapshotNotFoundError
DigitalTwinSnapshotStateConflictError
DigitalTwinSnapshotImmutableError
StateVariableValidationError
TwinEntityValidationError
TwinRelationshipValidationError
TwinConstraintValidationError
TwinCalibrationStateConflictError
TwinValidationStateConflictError
ScenarioBaselineValidationError
ScenarioBaselineStateConflictError
DTPublicationStateConflictError
DTDuplicateArtifactError
DTPayloadTooLargeError
DTCredentialContentError
```

---

## 15. Tests

### Structural tests

Minimum:

```text
150
```

Required structural coverage:

- schema exists;
- all required tables exist;
- all required columns exist;
- all foreign keys exist;
- all indexes exist;
- all unique constraints exist;
- all check constraints exist;
- all RLS policies exist;
- RLS enabled and forced on all tables;
- append-only triggers exist;
- transition guards exist;
- event wrapper functions exist;
- migration self-registration exists;
- repositories and exports exist;
- handoff contract exports exist.

### Live PostgreSQL integration tests

Minimum:

```text
120
```

Required live coverage:

- empty database install `0001` through final Stage 2E migration;
- rerun/idempotency;
- missing-context zero-row behavior;
- cross-tenant rejection;
- cross-workspace rejection;
- business mismatch rejection;
- intake lifecycle;
- definition lifecycle;
- instance lifecycle;
- snapshot creation/validation/publication;
- snapshot immutability;
- state-variable value and quality;
- entities and relationships;
- assumptions and constraints;
- calibration completion/failure;
- validation completion/issues;
- uncertainty assignment;
- confidence scoring;
- scenario-baseline lifecycle;
- publication lifecycle;
- component registry/deployment/rollback;
- append-only UPDATE/DELETE rejection;
- atomic outbox;
- rollback on event failure;
- nested-transaction prevention;
- idempotency;
- two full consecutive package runs with identical results.

### Contract tests

Minimum:

```text
20 BI→DT
20 DT→SIM
```

### Regression gates

Preserve:

```text
root browser regression
ADI source regression
handoff-contract full suite
database full suite
lint
typecheck
build
```

Run the full database package twice against the same disposable PostgreSQL database.

---

## 16. Validation commands

Inspect actual scripts first.

At minimum run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Also run exact repository commands for:

```text
Stage 2E structural tests
Stage 2E live integration tests
full database package
handoff-contract suite
root regression
ADI regression
empty-database install
migration rerun
migration 0001–0049 hash verification
git diff --check
git status --short
```

---

## 17. Frozen-file protection

Must remain byte-identical:

```text
migrations 0001–0049
BUILD-09 specification
BUILD-09 completion report
BUILD-10 specification
completed browser layer blocks and bundles
Engine v3 Monte Carlo core
existing SIM→ADI semantics
```

Only the next confirmed migration range may be added.

---

## 18. Out of scope

Do not implement:

- BUILD-10 browser assembly;
- Simulation persistence;
- ADI persistence;
- ABA persistence;
- Outcome Monitoring persistence;
- Continuous Learning persistence;
- browser DT→SIM wiring;
- external brokers;
- production deployment;
- frontend redesign;
- unrelated refactors.

---

## 19. Completion conditions

BUILD-12 is complete only when:

1. `business_digital_twin` schema exists;
2. all 12 required groups exist;
3. minimum table count is satisfied;
4. all tables have enabled and forced RLS;
5. append-only and lifecycle guards pass live tests;
6. BI→DT and DT→SIM contracts are complete;
7. DT events and atomic outbox wrappers exist;
8. all 12 repositories exist;
9. structural and live test minimums pass;
10. full regressions pass;
11. migrations `0001`–`0049` remain byte-identical;
12. completion report and database documentation exist;
13. queue state is updated;
14. no Stage 2F work is started.

---

## 20. Queue transition

Initial:

```text
BUILD-12: ready after repository verification
currentReadyBuild: BUILD-12 only if no earlier ready build exists
```

If BUILD-10 is still ready or in progress, BUILD-12 must be recorded as independently prepared but must not replace the active current-ready browser build unless repository queue policy explicitly permits parallel tracks.

Implementation:

```text
BUILD-12: ready -> in_progress -> completed
```

Do not create or ready BUILD-13 automatically.

---

## 21. Completion report

```text
BUILD-12 COMPLETION REPORT — DB-DT: DATABASE STAGE 2E BUSINESS DIGITAL TWIN PERSISTENCE

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
BI-TO-DT CONTRACT
DT-TO-SIM CONTRACT
EVENTS
REPOSITORIES
SECURITY
STRUCTURAL TESTS
LIVE INTEGRATION TESTS
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

Known limitations must state:

- Simulation persistence is not included;
- ADI/ABA/OM/CL persistence is not included;
- BUILD-10 browser assembly is separate;
- no external broker or production deployment was added.
