# BUILD-14 SPECIFICATION — DATABASE STAGE 2G AI DECISION INTELLIGENCE PERSISTENCE

- **Build ID:** BUILD-14
- **Layer:** DB-ADI
- **Database stage:** 2G
- **Name:** AI Decision Intelligence Persistence
- **Dependency:** BUILD-13
- **Browser dependency:** none
- **Specification status:** FROZEN
- **Implementation status:** BLOCKED until BUILD-13 completes
- **Frozen migration baseline:** Stage 2F final migration
- **Migration range:** determine the first free contiguous range after repository inspection; never guess
- **Schema:** `ai_decision_intelligence`

## 1. Objective

Implement the complete AI Decision Intelligence Persistence database tier using the conventions frozen by Stages 2A–2E.

Persist governed evidence and recommendations without exposing hidden chain-of-thought. Store structured rationale, evidence references, alternatives, risks, confidence, implementation steps, limitations, and monitoring requirements. ADI must never approve or execute.

The build must include schema migrations, strict TypeScript repositories, handoff contracts, outbox events, forced RLS, append-only evidence/history, lifecycle guards, structural tests, live PostgreSQL integration tests, documentation, and a completion report.

## 2. Entry gate

Before source changes:

1. verify `BUILD-13` is completed;
2. verify every earlier migration is byte-identical;
3. inspect the migration directory and freeze the next free range;
4. inspect the predecessor stage schema, publication package, repositories, tests, events, and handoff contract;
5. verify no competing schema or migration exists;
6. record the specification SHA-256 in queue metadata.

Stop on any mismatch.

## 3. Required table groups

### A. Intake and lineage

```text
adi_intake_packages
adi_intake_package_versions
adi_intake_source_references
adi_intake_status_history
```

### B. Decision questions

```text
decision_questions
decision_question_versions
decision_objectives
decision_constraints
```

### C. Decision cases

```text
decision_cases
decision_case_versions
decision_case_status_history
decision_case_inputs
```

### D. Reasoning runs

```text
reasoning_requests
reasoning_runs
reasoning_run_steps
reasoning_run_status_history
```

### E. Evidence

```text
decision_evidence
decision_evidence_versions
decision_evidence_links
decision_evidence_quality
```

### F. Alternatives

```text
decision_alternatives
decision_alternative_versions
alternative_outcome_estimates
alternative_risk_profiles
```

### G. Recommendations

```text
decision_recommendations
decision_recommendation_versions
recommendation_rationales
recommendation_implementation_steps
```

### H. Confidence and limitations

```text
decision_confidence_scores
decision_uncertainties
decision_limitations
decision_assumptions
```

### I. Policies and governance

```text
decision_policies
decision_policy_versions
decision_policy_evaluations
decision_guardrail_violations
```

### J. Monitoring requirements

```text
decision_monitoring_requirements
decision_monitoring_metrics
decision_review_schedules
```

### K. Publication

```text
adi_insight_packages
adi_insight_package_versions
adi_publication_packages
adi_publication_events
```

### L. Registry and deployment

```text
adi_component_registry
adi_component_registry_versions
adi_deployments
adi_deployment_rollbacks
```


Minimum table count: **47**. Supporting tables may be added only for verified referential integrity, lifecycle, evidence, or repository-convention requirements.

## 4. RLS and scope

Every `ai_decision_intelligence` table must:

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
infinicus-platform/packages/handoff-contracts/src/sim-to-adi.ts
```

### Outbound

Complete:

```text
infinicus-platform/packages/handoff-contracts/src/adi-to-aba.ts
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
adi.intake.received
adi.reasoning.started
adi.reasoning.completed
adi.reasoning.failed
adi.alternative.evaluated
adi.recommendation.generated
adi.confidence.calculated
adi.guardrail.violated
adi.decision.published
adi.data.published
```

Do not create duplicate synonyms for existing event names.

All aggregate changes and outbox inserts must be atomic on one shared transaction client. Nested transactions are prohibited.

## 8. Repositories

Create under:

```text
infinicus-platform/packages/database/src/repositories/adi/
```

Required repositories:

- `ADIIntakeRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `DecisionQuestionRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `DecisionCaseRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `ReasoningRunRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `DecisionEvidenceRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `DecisionAlternativeRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `DecisionRecommendationRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `DecisionConfidenceRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `DecisionPolicyRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `DecisionMonitoringRequirementRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `ADIPublicationRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.
- `ADIComponentRegistryRepository`: create, version, lifecycle, read, list, and evidence operations appropriate to its aggregate.

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
infinicus-platform/docs/database-stage-2g-ai-decision-intelligence.md
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
BUILD-14: blocked -> ready after BUILD-13 completion
BUILD-14: ready -> in_progress -> completed
currentReadyBuild: next authoritative build only after separate verification
```

Do not automatically implement or ready the next stage.

## 17. Completion report

```text
BUILD-14 COMPLETION REPORT — DB-ADI: DATABASE STAGE 2G AI DECISION INTELLIGENCE PERSISTENCE

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
