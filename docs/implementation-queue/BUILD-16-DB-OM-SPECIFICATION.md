# BUILD-16 SPECIFICATION — DATABASE STAGE 2I OUTCOME MONITORING PERSISTENCE

- **Build ID:** BUILD-16
- **Layer:** DB-OM
- **Database stage:** 2I
- **Name:** Outcome Monitoring Persistence
- **Dependency:** BUILD-15
- **Browser dependency:** none
- **Specification status:** FROZEN
- **Implementation status:** BLOCKED until BUILD-15 completes
- **Frozen migration baseline:** Stage 2H final migration
- **Migration range:** determine the first free contiguous range after repository inspection; never guess
- **Schema:** `outcome_monitoring`

## 1. Objective

Implement the complete Outcome Monitoring Persistence database tier using the conventions frozen by Stages 2A–2E.

Persist observed outcomes separately from expected outcomes. Preserve evidence, effective time, measurement quality, attribution uncertainty, target breaches, alerts, and reviews. OM observes and evaluates; it does not silently rewrite historical decisions.

The build must include schema migrations, strict TypeScript repositories, handoff contracts, outbox events, forced RLS, append-only evidence/history, lifecycle guards, structural tests, live PostgreSQL integration tests, documentation, and a completion report.

## 2. Entry gate

Before source changes:

1. verify `BUILD-15` is completed;
2. verify every earlier migration is byte-identical;
3. inspect the migration directory and freeze the next free range;
4. inspect the predecessor stage schema, publication package, repositories, tests, events, and handoff contract;
5. verify no competing schema or migration exists;
6. record the specification SHA-256 in queue metadata.

Stop on any mismatch.

## 3. Required table groups

### A. Intake and lineage

```text
om_intake_packages
om_intake_package_versions
om_intake_source_references
om_intake_status_history
```

### B. Monitoring plans

```text
monitoring_plans
monitoring_plan_versions
monitoring_plan_metrics
monitoring_plan_schedules
```

### C. Action tracking

```text
monitored_actions
monitored_action_versions
monitored_action_status_history
action_execution_observations
```

### D. Outcome observations

```text
outcome_observations
outcome_observation_versions
outcome_measurements
outcome_evidence
```

### E. Targets and thresholds

```text
outcome_targets
outcome_target_versions
outcome_thresholds
threshold_breaches
```

### F. Variance

```text
outcome_variance_runs
outcome_variance_results
expected_actual_comparisons
variance_explanations
```

### G. Alerts and incidents

```text
monitoring_alert_rules
monitoring_alert_rule_versions
monitoring_alerts
monitoring_incidents
```

### H. Attribution

```text
outcome_attribution_runs
outcome_attribution_factors
outcome_attribution_results
```

### I. Reviews

```text
outcome_reviews
outcome_review_findings
outcome_review_actions
outcome_review_status_history
```

### J. Feedback packages

```text
learning_feedback_packages
learning_feedback_package_versions
learning_feedback_evidence
```

### K. Publication

```text
om_publication_packages
om_publication_package_versions
om_publication_events
```

### L. Registry and deployment

```text
om_component_registry
om_component_registry_versions
om_deployments
om_deployment_rollbacks
```


Minimum table count: **45**. Supporting tables may be added only for verified referential integrity, lifecycle, evidence, or repository-convention requirements.

## 4. RLS and scope

Every `outcome_monitoring` table must:

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
infinicus-platform/packages/handoff-contracts/src/aba-to-om.ts
```

### Outbound

Complete:

```text
infinicus-platform/packages/handoff-contracts/src/om-to-cl.ts
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
om.intake.received
om.monitoring.started
om.observation.recorded
om.target.breached
om.variance.calculated
om.alert.raised
om.incident.opened
om.review.completed
om.feedback.published
om.data.published
```

Do not create duplicate synonyms for existing event names.

All aggregate changes and outbox inserts must be atomic on one shared transaction client. Nested transactions are prohibited.

## 8. Repositories

Create under:

```text
infinicus-platform/packages/database/src/repositories/om/
```

Required repositories:

- `OMIntakeRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `MonitoringPlanRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `MonitoredActionRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `OutcomeObservationRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `OutcomeTargetRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `OutcomeVarianceRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `MonitoringAlertRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `MonitoringIncidentRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `OutcomeAttributionRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `OutcomeReviewRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `LearningFeedbackPackageRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `OMPublicationRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `OMComponentRegistryRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.

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
infinicus-platform/docs/database-stage-2i-outcome-monitoring.md
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
BUILD-16: blocked -> ready after BUILD-15 completion
BUILD-16: ready -> in_progress -> completed
currentReadyBuild: next authoritative build only after separate verification
```

Do not automatically implement or ready the next stage.

## 17. Completion report

```text
BUILD-16 COMPLETION REPORT — DB-OM: DATABASE STAGE 2I OUTCOME MONITORING PERSISTENCE

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
