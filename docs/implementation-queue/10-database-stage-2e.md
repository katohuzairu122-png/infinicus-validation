# INFINICUS DATABASE STAGE 2E — BUSINESS DIGITAL TWIN IMPLEMENTATION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

This prompt is implementation-ready. Do not redesign the architecture. Inspect the existing code, align to established conventions, implement the specified scope, run validation, and return the completion report.

Read and obey:

1. `CLAUDE.md`
2. Database Stage 2A completion report
3. Database Stage 2B completion report
4. Database Stage 2C completion report
5. Database Stage 2D completion report
6. Frozen migration manifest
7. Existing `packages/database` conventions
8. Existing tenant transaction and PostgreSQL integration-test harness
9. Business Digital Twin architecture blocks DT-01 through DT-24 or DT-25 according to the completed Digital Twin audit
10. `INFINICUS-DIGITAL-TWIN-BLOCK-AUDIT.md`
11. Platform Event Catalogue
12. Layer Handoff Contracts
13. Event Backbone contracts already implemented at execution time

## Objective

Implement Database Stage 2E only:

```text
Business Digital Twin persistence
```

Create the canonical schema:

```text
business_digital_twin
```

Do not create competing schemas such as:

```text
dt
digital_twin
twin
```

Use the next actual migration number after the confirmed final Stage 2D migration.

Do not guess the migration number.

---

# 1. FROZEN MIGRATION RULE

All migrations through the final Stage 2D migration are frozen.

Do not edit them.

When a defect is discovered:

```text
document defect
→ create forward-only correction migration
→ preserve frozen checksums
```

Do not rewrite migration history.

---

# 2. AUDIT GATE

Before creating migrations, read the completed Digital Twin block audit.

Use exactly one architecture outcome:

```text
A. DT 24/24 is complete
B. DT-25 Master Integration, Production Assembly and Deployment is required
```

Do not invent DT-25 without an audit-backed responsibility gap.

The database implementation must align with the audit result.

---

# 3. CANONICAL REFERENCES

Use:

```text
tenancy.tenants
tenancy.workspaces
platform.businesses
identity users/service accounts where applicable
business_operations publication references
business_intelligence result and publication references
```

Do not duplicate:

```text
business identity
operational records
analytical datasets
BI findings
Simulation records
```

The Digital Twin owns the versioned business representation and state model.

---

# 4. REQUIRED TABLE GROUPS

Implement the following logical groups.

## A. Twin registry and lifecycle

```text
digital_twins
digital_twin_versions
digital_twin_status_history
digital_twin_component_registry
digital_twin_component_versions
```

Required lifecycle states:

```text
draft
building
active
degraded
suspended
deprecated
revoked
archived
```

Reject invalid transitions.

## B. Twin entities

```text
twin_entities
twin_entity_versions
twin_entity_attributes
twin_entity_attribute_values
twin_entity_tags
```

Entity types may include:

```text
business
location
business_unit
product
service
customer_segment
supplier
worker_group
asset
inventory_node
workflow
financial_account
market
risk
custom
```

Use a controlled registry or constrained type reference.

## C. Twin relationships

```text
twin_relationships
twin_relationship_versions
twin_relationship_attributes
twin_relationship_evidence
```

Relationship examples:

```text
owns
contains
depends_on
supplies
serves
employs
uses
located_at
influences
constrains
correlates_with
```

Do not permit orphan source or target entities.

## D. Current state and state history

```text
twin_states
twin_state_versions
twin_state_values
twin_state_history
twin_state_transition_records
```

Support state dimensions such as:

```text
operational
financial
customer
workforce
inventory
capacity
risk
market
quality
compliance
```

Historical state must be immutable.

## E. Observations and evidence

```text
twin_observations
twin_observation_values
twin_observation_evidence
twin_evidence_references
twin_provenance_records
```

Preserve:

```text
source layer
source package
source record
observed_at
effective_at
confidence
quality
limitations
classification
```

## F. Assumptions

```text
twin_assumptions
twin_assumption_versions
twin_assumption_evidence
twin_assumption_status_history
```

Statuses:

```text
proposed
validated
active
superseded
rejected
revoked
```

Do not overwrite active assumptions in place.

## G. Constraints

```text
twin_constraints
twin_constraint_versions
twin_constraint_evidence
twin_constraint_violations
```

Constraint types may include:

```text
hard
soft
regulatory
financial
operational
capacity
temporal
dependency
custom
```

## H. Snapshots

```text
twin_snapshots
twin_snapshot_versions
twin_snapshot_entities
twin_snapshot_relationships
twin_snapshot_state_values
twin_snapshot_assumptions
twin_snapshot_constraints
twin_snapshot_evidence
```

Published snapshots must be immutable and reproducible.

## I. State update intake

```text
twin_state_update_packages
twin_state_update_package_versions
twin_state_update_items
twin_state_update_status_history
```

These receive controlled BI and BO inputs.

## J. Conflict and divergence

```text
twin_conflicts
twin_conflict_evidence
twin_divergence_measurements
twin_divergence_thresholds
twin_divergence_status_history
```

Conflict statuses:

```text
detected
reviewing
accepted
resolved
dismissed
```

## K. Calibration

```text
twin_calibration_requests
twin_calibration_runs
twin_calibration_inputs
twin_calibration_results
twin_calibration_evidence
twin_calibration_status_history
```

Calibration statuses:

```text
requested
validating
running
completed
failed
rejected
revoked
```

Do not activate calibration automatically.

## L. Confidence, quality, and limitations

```text
twin_confidence_records
twin_quality_records
twin_limitations
twin_validation_records
```

Persist separate confidence and quality dimensions.

## M. Publication and handoff

```text
twin_publication_packages
twin_publication_package_versions
twin_publication_items
twin_handoff_receipts
twin_handoff_acknowledgements
twin_handoff_rejections
```

Publication targets:

```text
simulation
ai_decision_intelligence
```

## N. Deployment and rollback

```text
twin_assemblies
twin_assembly_versions
twin_deployments
twin_deployment_status_history
twin_rollbacks
```

If the audit concluded DT-25 is required, these tables must explicitly support the DT-25 responsibilities.

---

# 5. REQUIRED RELATIONSHIPS

Implement explicit relationships between:

```text
digital twin → platform business
digital twin version → entity versions
entity → attribute versions
relationship → source and target entities
state version → state values
state update package → BI/BO source package
observation → evidence and provenance
assumption → evidence and status history
constraint → evidence and violations
snapshot version → entities, relationships, states, assumptions, constraints, and evidence
conflict → affected twin state/entity/relationship
divergence measurement → threshold version
calibration run → request, inputs, result, and evidence
publication package → snapshot/state/result references
deployment → assembly version
rollback → deployment and previous assembly version
```

Do not allow orphan state, snapshot, calibration, or publication records.

---

# 6. VERSIONING RULES

Version independently:

```text
digital twin
entity
relationship
state
assumption
constraint
snapshot
divergence threshold
calibration result
publication package
assembly
deployment configuration
```

Published, active, completed, or deployed versions are immutable.

Corrections create new versions.

Use positive integer version numbers and unique scoped version constraints.

---

# 7. STATE UPDATE PRECEDENCE

Persist enough metadata to enforce:

1. newer effective time outranks older;
2. equal effective time uses higher confidence;
3. equal time and confidence uses deterministic source precedence;
4. weaker evidence may be retained without replacing current state;
5. revoked source package cannot update state;
6. hard-constraint conflict creates a conflict record;
7. every accepted state update creates immutable history.

Do not encode all precedence solely in application memory.

---

# 8. SCORE RULES

All quality and confidence scores must satisfy:

```text
0 <= score <= 1
```

Persist separately:

```text
source quality
observation confidence
state confidence
entity confidence
relationship confidence
snapshot confidence
calibration confidence
divergence confidence
```

Do not collapse all scores into one field.

---

# 9. TEMPORAL RULES

Support:

```text
effective_at
observed_at
valid_from
valid_to
snapshot_at
generated_at
published_at
activated_at
revoked_at
```

Reject invalid ranges and overlapping active versions where exclusivity is required.

---

# 10. SUGGESTED MIGRATION GROUPING

Use the next actual migration number after Stage 2D.

Recommended sequence:

```text
<next>_business_digital_twin_schema.sql
<next+1>_dt_registry_and_lifecycle.sql
<next+2>_dt_entities_and_attributes.sql
<next+3>_dt_relationships.sql
<next+4>_dt_state_and_history.sql
<next+5>_dt_observations_evidence_provenance.sql
<next+6>_dt_assumptions_and_constraints.sql
<next+7>_dt_snapshots.sql
<next+8>_dt_state_update_intake.sql
<next+9>_dt_conflicts_and_divergence.sql
<next+10>_dt_calibration.sql
<next+11>_dt_quality_confidence_limitations.sql
<next+12>_dt_publication_and_handoffs.sql
<next+13>_dt_assemblies_deployments_rollbacks.sql
<next+14>_dt_indexes.sql
<next+15>_dt_rls.sql
<next+16>_dt_triggers.sql
<next+17>_dt_event_functions.sql
```

Adjust only to align with repository conventions.

---

# 11. CONSTRAINTS

Create named constraints for:

```text
valid lifecycle states
valid entity types
valid relationship types
positive versions
valid score ranges
valid date ranges
unique active twin per business where policy requires
unique twin version
unique entity version
unique relationship version
unique state version
unique snapshot version
unique assumption version
unique constraint version
unique publication package version
unique assembly version
unique deployment version
valid publication target
valid calibration status
valid conflict status
valid divergence threshold
```

---

# 12. FOREIGN KEYS

Protect:

```text
published snapshots
state history
observations
evidence
assumptions
constraints
conflicts
divergence records
calibration results
publication packages
deployment and rollback history
```

Prefer `RESTRICT` for published and historical records.

Do not cascade-delete Digital Twin history when upstream source records change.

---

# 13. INDEXES

Index at minimum:

```text
tenant_id
workspace_id
business_id
digital_twin_id
entity type
entity external/source reference
relationship source and target
state dimension/key
effective_at
observed_at
snapshot_at
status
source package
confidence
quality
assumption status
constraint type
conflict status
divergence threshold
calibration status
publication target
correlation_id
handoff package ID
assembly version
deployment status
```

Add justified partial indexes for active/current/published records.

Avoid redundant indexes.

---

# 14. ROW-LEVEL SECURITY

Enable RLS for every tenant-owned table.

Enforce:

```text
tenant
workspace
business
digital twin scope where applicable
```

Missing context must fail closed.

Verify:

- tenant A cannot access tenant B;
- same-tenant workspace A cannot access workspace B;
- business A cannot access business B where scoped;
- application role cannot bypass RLS;
- privileged pool is restricted to approved infrastructure operations.

---

# 15. IMMUTABILITY AND TRIGGERS

Immutable after publication/completion:

```text
snapshot versions
state history
observation evidence
assumption history
constraint history
calibration results
publication packages
handoff acknowledgements
deployment evidence
rollback evidence
```

Use `updated_at` triggers only for mutable records.

Use repository-managed or controlled trigger-based version increments according to existing conventions.

---

# 16. EVENT OUTBOX FUNCTIONS

Create transaction-safe wrappers or repository helpers for:

```text
dt.twin.created
dt.entity.created
dt.entity.updated
dt.relationship.updated
dt.state.updated
dt.assumption.updated
dt.constraint.updated
dt.divergence.detected
dt.calibration.completed
dt.snapshot.published
dt.data.published
```

Use registered canonical names if exact names differ.

Every event preserves:

```text
tenant
workspace
business
aggregate
event version
correlation
causation
provenance
```

Reuse the Stage 2A outbox implementation.

---

# 17. REPOSITORY ADAPTERS

Implement at minimum:

```text
DigitalTwinRepository
TwinEntityRepository
TwinRelationshipRepository
TwinStateRepository
TwinObservationRepository
TwinAssumptionRepository
TwinConstraintRepository
TwinSnapshotRepository
TwinConflictRepository
TwinDivergenceRepository
TwinCalibrationRepository
TwinPublicationRepository
TwinHandoffRepository
TwinDeploymentRepository
```

Repositories must:

- use typed records;
- use parameterized SQL;
- require tenant context;
- use tenant transactions;
- preserve correlation;
- expose controlled errors;
- support idempotency;
- avoid cross-layer writes.

---

# 18. LIVE POSTGRESQL 16 TESTS

Use the existing two-pool harness.

## Registry

- create twin;
- create version;
- valid lifecycle transitions;
- invalid transitions rejected;
- one active twin rule where applicable.

## Entities and relationships

- create entity/version;
- attributes and values;
- create relationship/version;
- orphan relationship rejected;
- version immutability.

## State

- create state version;
- state values;
- state history;
- precedence rules;
- weaker evidence retained but not promoted;
- revoked source blocked;
- rollback atomicity;
- `dt.state.updated`.

## Observations and evidence

- observation creation;
- quality/confidence bounds;
- evidence and provenance;
- restricted classification handling.

## Assumptions and constraints

- create/version;
- valid transitions;
- supersession;
- violation records;
- hard-constraint conflict.

## Snapshots

- create snapshot/version;
- include entities, relationships, state, assumptions, constraints, and evidence;
- publish immutable snapshot;
- reproducibility checks;
- `dt.snapshot.published`.

## Conflict and divergence

- detect conflict;
- divergence measurement;
- threshold version;
- valid status transitions;
- `dt.divergence.detected`.

## Calibration

- request/run/result;
- valid status transitions;
- completed result immutable;
- no automatic activation;
- `dt.calibration.completed`.

## Publication and handoff

- create package;
- add items;
- target validation;
- publish;
- acknowledge;
- reject;
- revoke;
- duplicate version idempotency;
- `dt.data.published`.

## Assembly, deployment, rollback

- register assembly/version;
- deployment status;
- rollback record;
- audit history;
- align with DT audit result.

## RLS and rollback

- tenant isolation;
- workspace isolation;
- business isolation;
- fail closed;
- application role cannot bypass;
- domain and outbox rollback together.

Target:

```text
at least 110 meaningful live integration tests
```

---

# 19. STRUCTURAL TESTS

Verify:

```text
schema
tables
columns
constraints
foreign keys
indexes
RLS
policies
triggers
event functions
repositories
exports
migration count
frozen checksum manifest
DT audit alignment
```

---

# 20. DOCUMENTATION

Create or update:

```text
docs/database/stage-2e-business-digital-twin.md
docs/database/digital-twin-schema.md
docs/database/digital-twin-state-versioning.md
docs/database/digital-twin-snapshots.md
docs/database/digital-twin-conflict-divergence.md
docs/database/digital-twin-calibration.md
docs/database/digital-twin-events.md
docs/database/digital-twin-repositories.md
docs/database/digital-twin-rls.md
docs/database/digital-twin-test-plan.md
packages/database/README.md
```

Document the DT 24/24 or DT-25 audit decision and exact database implications.

---

# 21. VALIDATION COMMANDS

Run:

```bash
pnpm install
pnpm workspace:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @infinicus/database test:integration
```

Apply all migrations from an empty PostgreSQL 16 database.

Rerun migrations to prove idempotency.

Do not use production credentials.

---

# 22. PROHIBITED WORK

Do not implement:

- Simulation schema;
- ADI, ABA, OM, or CL schemas;
- frontend;
- event relay;
- Simulation execution;
- Digital Twin calibration activation;
- vertical-slice consumers;
- external integrations;
- edits to frozen migrations.

---

# 23. STOP CONDITION

Stop after:

1. Digital Twin schema exists;
2. audit decision is reflected;
3. required table groups exist;
4. constraints and indexes exist;
5. RLS passes;
6. versioning and immutability work;
7. snapshots are reproducible;
8. conflicts and divergence work;
9. calibration persistence works without activation;
10. event functions work;
11. repositories work;
12. live integration tests pass;
13. migrations are idempotent;
14. documentation is complete;
15. final migration range is frozen;
16. completion report is produced.

Do not begin Stage 2F.

---

# 24. COMPLETION REPORT FORMAT

Return:

```text
DATABASE STAGE 2E REPORT

Digital Twin audit decision:
- DT 24/24 complete
or
- DT-25 required

Migration range:
- first
- last
- frozen status

Created:
- schema
- tables
- constraints
- foreign keys
- indexes
- RLS policies
- triggers
- event functions
- repositories
- tests
- documentation

Validation:
- migration apply
- migration idempotency
- structural tests
- repository tests
- snapshot reproducibility
- precedence tests
- conflict/divergence tests
- calibration tests
- RLS tests
- rollback tests
- build

Totals:
- tables
- constraints
- foreign keys
- indexes
- RLS tables
- triggers
- event functions
- repositories
- tests passing

Security:
- tenant isolation
- workspace isolation
- business isolation
- application-role RLS
- fail-closed behavior

Known limitations:
- exact limitation
- impact
- recommended follow-up

Next recommended task:
- Database Stage 2F — Simulation
```
