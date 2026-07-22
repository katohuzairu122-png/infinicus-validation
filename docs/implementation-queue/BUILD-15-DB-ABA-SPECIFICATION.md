# BUILD-15 SPECIFICATION — DATABASE STAGE 2H APPROVED BUSINESS ACTION PERSISTENCE

- **Build ID:** BUILD-15
- **Layer:** DB-ABA
- **Database stage:** 2H
- **Name:** Approved Business Action Persistence
- **Dependency:** BUILD-14
- **Browser dependency:** none
- **Specification status:** FROZEN
- **Implementation status:** BLOCKED until BUILD-14 completes
- **Frozen migration baseline:** Stage 2G final migration
- **Migration range:** determine the first free contiguous range after repository inspection; never guess
- **Schema:** `approved_business_action`

## 1. Objective

Implement the complete Approved Business Action Persistence database tier using the conventions frozen by Stages 2A–2E.

Approval is distinct from execution. Persist human or authorized-system authority, rationale, modifications, attestations, control gates, and audit. No external business action may be executed by this database stage.

The build must include schema migrations, strict TypeScript repositories, handoff contracts, outbox events, forced RLS, append-only evidence/history, lifecycle guards, structural tests, live PostgreSQL integration tests, documentation, and a completion report.

## 2. Entry gate

Before source changes:

1. verify `BUILD-14` is completed;
2. verify every earlier migration is byte-identical;
3. inspect the migration directory and freeze the next free range;
4. inspect the predecessor stage schema, publication package, repositories, tests, events, and handoff contract;
5. verify no competing schema or migration exists;
6. record the specification SHA-256 in queue metadata.

Stop on any mismatch.

## 3. Required table groups

### A. Intake and lineage

```text
aba_intake_packages
aba_intake_package_versions
aba_intake_source_references
aba_intake_status_history
```

### B. Review packages

```text
action_review_packages
action_review_package_versions
action_review_evidence
action_review_status_history
```

### C. Approval policies

```text
approval_policies
approval_policy_versions
approval_policy_rules
approval_policy_evaluations
```

### D. Approvers and authority

```text
approver_assignments
approver_assignment_versions
approval_authority_scopes
approval_delegations
```

### E. Decisions

```text
approval_decisions
approval_decision_versions
approval_decision_rationales
approval_decision_modifications
```

### F. Actions

```text
approved_actions
approved_action_versions
approved_action_steps
approved_action_constraints
```

### G. Execution plans

```text
action_execution_plans
action_execution_plan_versions
action_execution_dependencies
action_execution_windows
```

### H. Control gates

```text
action_control_gates
action_control_gate_evaluations
action_holds
action_releases
```

### I. Exceptions and appeals

```text
approval_exceptions
approval_exception_evidence
approval_appeals
approval_appeal_decisions
```

### J. Audit and signatures

```text
approval_attestations
approval_signatures
approval_audit_events
```

### K. Publication

```text
aba_publication_packages
aba_publication_package_versions
aba_publication_events
```

### L. Registry and deployment

```text
aba_component_registry
aba_component_registry_versions
aba_deployments
aba_deployment_rollbacks
```


Minimum table count: **46**. Supporting tables may be added only for verified referential integrity, lifecycle, evidence, or repository-convention requirements.

## 4. RLS and scope

Every `approved_business_action` table must:

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
infinicus-platform/packages/handoff-contracts/src/adi-to-aba.ts
```

### Outbound

Complete:

```text
infinicus-platform/packages/handoff-contracts/src/aba-to-om.ts
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
aba.intake.received
aba.review.requested
aba.review.started
aba.action.approved
aba.action.approved_with_modifications
aba.action.rejected
aba.action.held
aba.action.released
aba.action.published
aba.data.published
```

Do not create duplicate synonyms for existing event names.

All aggregate changes and outbox inserts must be atomic on one shared transaction client. Nested transactions are prohibited.

## 8. Repositories

Create under:

```text
infinicus-platform/packages/database/src/repositories/approved_action/
```

Required repositories:

- `ABAIntakeRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `ActionReviewRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `ApprovalPolicyRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `ApproverAuthorityRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `ApprovalDecisionRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `ApprovedActionRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `ActionExecutionPlanRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `ActionControlGateRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `ApprovalExceptionRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `ApprovalAppealRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `ABAAuditRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `ABAPublicationRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `ABAComponentRegistryRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.

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
infinicus-platform/docs/database-stage-2h-approved-business-action.md
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
BUILD-15: blocked -> ready after BUILD-14 completion
BUILD-15: ready -> in_progress -> completed
currentReadyBuild: next authoritative build only after separate verification
```

Do not automatically implement or ready the next stage.

## 17. Completion report

```text
BUILD-15 COMPLETION REPORT — DB-ABA: DATABASE STAGE 2H APPROVED BUSINESS ACTION PERSISTENCE

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
