# INFINICUS DATABASE STAGE 2J — CONTINUOUS LEARNING IMPLEMENTATION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

This prompt is implementation-ready. Do not redesign. Inspect, align, implement, validate, freeze, and report.

Read Stages 2A–2I completion reports, frozen migration manifest, CL blocks CL-01 through CL-25, Event Catalogue, Handoff Contracts, and existing database conventions.

## Objective

Implement Database Stage 2J only:

```text
Continuous Learning persistence
```

Canonical schema:

```text
continuous_learning
```

Use the next actual migration number after Stage 2I.

## Required table groups

### Learning intake

```text
learning_requests
learning_request_versions
learning_request_status_history
learning_input_packages
learning_input_package_versions
learning_input_items
learning_input_lineage
```

### Learning evidence

```text
learning_evidence_packages
learning_evidence_package_versions
learning_evidence_items
learning_evidence_relationships
learning_evidence_quality
learning_evidence_limitations
learning_provenance_records
```

### Learning candidates

```text
learning_candidates
learning_candidate_versions
learning_candidate_targets
learning_candidate_changes
learning_candidate_risks
learning_candidate_benefits
learning_candidate_limitations
learning_candidate_rollback_recommendations
```

Candidate types may include:

```text
data_quality_rule_update
operational_policy_update
forecast_calibration
digital_twin_calibration
simulation_distribution_update
decision_rule_update
threshold_update
risk_model_update
assumption_update
no_change_recommended
insufficient_evidence
```

### Validation

```text
learning_validation_policies
learning_validation_policy_versions
learning_validation_runs
learning_validation_checks
learning_validation_results
learning_validation_evidence
learning_validation_failures
```

### Approval

```text
learning_approval_policies
learning_approval_policy_versions
learning_approval_requests
learning_approval_steps
learning_approval_decisions
learning_approval_evidence
learning_separation_of_duties_rules
```

### Publication

```text
learning_publications
learning_publication_versions
learning_publication_items
learning_publication_status_history
learning_publication_revocations
```

### Target feedback packages

```text
learning_feedback_packages
learning_feedback_package_versions
learning_feedback_items
learning_feedback_limitations
learning_feedback_rollback_metadata
learning_feedback_handoff_receipts
learning_feedback_handoff_acknowledgements
learning_feedback_handoff_rejections
```

Target layers:

```text
data_acquisition
business_operations
business_intelligence
business_digital_twin
simulation
ai_decision_intelligence
approved_business_action
outcome_monitoring
```

### Effectiveness and lifecycle

```text
learning_effectiveness_records
learning_candidate_supersessions
learning_candidate_rejections
learning_candidate_expirations
learning_audit_records
```

### Registry, deployment, rollback

```text
learning_component_registry
learning_component_versions
learning_deployments
learning_rollbacks
```

These track CL infrastructure only. They do not activate upstream target changes.

## Lifecycle states

Learning request:

```text
requested
validating
accepted
rejected
processing
completed
failed
cancelled
revoked
```

Candidate:

```text
proposed
validating
validated
validation_failed
pending_approval
approved
rejected
published
superseded
expired
revoked
```

Publication:

```text
draft
ready
published
revoked
superseded
```

Reject invalid transitions.

## Core safety rules

- Learning does not directly mutate upstream production state.
- Validation is mandatory before approval.
- Human approval is mandatory for publishable change candidates.
- Separation of duties is enforced for high-risk candidates.
- `no_change_recommended` and `insufficient_evidence` are first-class outcomes.
- Every candidate has evidence, confidence, limitations, target scope, and rollback recommendation where applicable.
- Publication creates target-specific feedback packages only.
- Revocation must propagate to unactivated target proposals.
- No automatic model, prompt, threshold, policy, calibration, or deployment activation.

## Suggested migration grouping

```text
<next>_continuous_learning_schema.sql
<next+1>_cl_requests_inputs.sql
<next+2>_cl_evidence.sql
<next+3>_cl_candidates.sql
<next+4>_cl_validation.sql
<next+5>_cl_approval.sql
<next+6>_cl_publication.sql
<next+7>_cl_feedback_packages_handoffs.sql
<next+8>_cl_effectiveness_lifecycle.sql
<next+9>_cl_registry_deployment.sql
<next+10>_cl_indexes.sql
<next+11>_cl_rls.sql
<next+12>_cl_triggers.sql
<next+13>_cl_event_functions.sql
```

## Constraints

Enforce valid states, positive versions, score ranges, valid target layers, supported candidate types, unique request/candidate/publication/package versions, valid approval sequence, separation of duties, valid expiry dates, valid rollback metadata, and idempotency keys.

## RLS

Enable RLS on every tenant-owned table. Enforce tenant, workspace, business, target scope, and authorized reviewer scope. Missing context fails closed.

## Immutability

Immutable:

```text
evidence package versions
validation results
approval decisions
approved candidate versions
published learning versions
feedback package versions
handoff acknowledgements
revocation evidence
deployment evidence
```

## Event functions

Create canonical equivalents of:

```text
cl.learning.requested
cl.learning.validated
cl.learning.approved
cl.learning.published
cl.learning.revoked
```

Reuse canonical outbox and preserve lineage.

## Repositories

Implement at minimum:

```text
LearningRequestRepository
LearningEvidenceRepository
LearningCandidateRepository
LearningValidationRepository
LearningApprovalRepository
LearningPublicationRepository
LearningFeedbackPackageRepository
LearningHandoffRepository
LearningEffectivenessRepository
LearningDeploymentRepository
```

## Live PostgreSQL 16 tests

Cover:

- request lifecycle and lineage;
- evidence quality and limitations;
- candidate types and targets;
- validation policies, runs, checks, pass/fail;
- approval policies, steps, SoD, approval/rejection;
- publication and revocation;
- all eight target feedback package types;
- rollback metadata;
- target handoff acknowledgement/rejection;
- no direct upstream mutation;
- event outbox atomicity;
- RLS and rollback;
- registry/deployment.

Target at least 140 meaningful live integration tests.

## Structural tests

Verify schema, tables, columns, constraints, FKs, indexes, RLS, policies, triggers, event functions, repositories, exports, migration count, and frozen checksums.

## Documentation

Create:

```text
docs/database/stage-2j-continuous-learning.md
docs/database/cl-schema.md
docs/database/cl-candidates-validation.md
docs/database/cl-approval-separation-of-duties.md
docs/database/cl-publication-feedback-packages.md
docs/database/cl-revocation.md
docs/database/cl-events.md
docs/database/cl-repositories.md
docs/database/cl-rls.md
docs/database/cl-test-plan.md
```

## Validation

Run standard workspace, lint, typecheck, test, build, and PostgreSQL integration commands. Apply all migrations from empty PostgreSQL 16 and rerun for idempotency.

## Prohibited work

Do not implement automatic target activation, frontend, event relay, upstream mutation, external deployment adapters, or edits to frozen migrations.

## Stop condition

Stop after requests, evidence, candidates, validation, approval, publication, all eight feedback packages, revocation, RLS, events, repositories, tests, idempotency, documentation, and final migration freeze are complete.

Do not begin Event Backbone implementation automatically.

## Completion report

Return exact migration range, totals, validation, approval, target packages, revocation, no-mutation proof, RLS, limitations, and:

```text
Next recommended task:
Event Backbone Phase 1 — Canonical Event Contracts
```
