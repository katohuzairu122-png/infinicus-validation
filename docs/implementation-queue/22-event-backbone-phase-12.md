# INFINICUS EVENT BACKBONE — PHASE 12 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey:

1. `CLAUDE.md`
2. `INFINICUS-PLATFORM-EVENT-CATALOGUE.md`
3. `INFINICUS-LAYER-HANDOFF-CONTRACTS.md`
4. `INFINICUS-EVENT-BACKBONE-IMPLEMENTATION-PLAN.md`
5. Event Backbone Phases 1–11 implementations and reports
6. Database Stage 2J Continuous Learning implementation
7. Existing event, handoff, inbox, outbox, relay, learning, approval, and audit patterns
8. Existing tenant-scoped PostgreSQL integration-test harness
9. Existing ABA approval-policy conventions where reusable

## Objective

Implement Event Backbone Phase 12 only:

```text
Continuous Learning validation
→ controlled approval
→ approved learning publication
→ upstream feedback package creation
```

Implement:

```text
cl.learning.requested
→ validate learning-intake package and candidates
→ run deterministic validation workflow
→ create validation evidence
→ route candidate for approval
→ persist approval decision
→ publish only approved learning
→ emit cl.learning.published
```

Then create controlled feedback packages for the intended target layers:

```text
CL → DA
CL → BO
CL → BI
CL → DT
CL → SIM
CL → ADI
CL → ABA
CL → OM
```

Do not directly mutate any upstream layer.

Do not automatically deploy any model, prompt, rule, threshold, policy, calibration, distribution, or production configuration.

Stop after controlled publication and feedback-package generation are live-tested.

---

# 1. PRECONDITIONS

Confirm:

- Event Backbone Phases 1–11 pass;
- `cl.learning.requested` exists;
- `cl.learning.published` exists;
- Stage 2J validation, approval, publication, and feedback persistence exists;
- learning candidates exist in allowed pre-publication states;
- audit, provenance, inbox, outbox, relay, and RLS pass;
- approval-policy infrastructure exists or a CL-specific equivalent is present;
- Stage 2J migration range is frozen.

If validation, approval, publication, or feedback tables are missing, stop and report the prerequisite.

Do not create ad hoc production-update tables.

---

# 2. TARGET STRUCTURE

Create or complete:

```text
apps/api/src/eventing/consumers/cl-validation/
├── LearningRequestedConsumer.ts
├── LearningCandidateValidator.ts
├── LearningValidationService.ts
├── LearningApprovalService.ts
├── LearningPublicationService.ts
├── LearningFeedbackPackageMapper.ts
├── LearningPolicyResolver.ts
├── ClValidationConsumerDefinition.ts
├── errors.ts
└── index.ts
```

Tests:

```text
apps/api/tests/eventing/cl-validation/
├── learning-requested.unit.test.ts
├── learning-candidate-validator.unit.test.ts
├── learning-policy.unit.test.ts
├── learning-publication.unit.test.ts
├── learning-validation.integration.test.ts
├── learning-approval.integration.test.ts
├── learning-publication.integration.test.ts
├── learning-feedback.integration.test.ts
├── learning-idempotency.integration.test.ts
├── learning-rls.integration.test.ts
└── learning-failure.integration.test.ts
```

Follow existing package conventions where they differ.

---

# 3. INPUT EVENT

Consume:

```text
cl.learning.requested
```

Expected minimum payload:

```ts
{
  learningRequestId: string;
  learningIntakePackageId: string;
  outcomePackageId: string;
  outcomeRecordId: string;
  approvedActionId: string;
  decisionId: string;
  businessId: string;
  outcomeStatus:
    | "achieved"
    | "partially_achieved"
    | "not_achieved"
    | "inconclusive"
    | "adverse";
  candidateTypes: string[];
  confidenceScore: number;
  requestedAt: string;
}
```

Reject when:

- version unsupported;
- intake package missing;
- package revoked;
- tenant/workspace/business mismatch;
- no candidate exists;
- all candidates are terminally rejected;
- provenance incomplete;
- evidence package missing;
- learning request already processed at the same version.

---

# 4. LEARNING CANDIDATE STATES

Support:

```text
proposed
requires_more_evidence
validating
validated
validation_failed
pending_approval
approved
rejected
published
revoked
```

Allowed flow:

```text
proposed → validating
requires_more_evidence → validating
validating → validated
validating → validation_failed
validated → pending_approval
pending_approval → approved
pending_approval → rejected
approved → published
approved → revoked
published → revoked
```

Reject invalid transitions.

No candidate may move directly from `proposed` to `published`.

---

# 5. VALIDATION TYPES

Support deterministic validation records for:

```text
evidence_completeness
schema_validation
statistical_significance
confidence_threshold
cross-period_consistency
cross-business_consistency
simulation_backtest
digital_twin_replay
decision_rule_replay
policy_compliance
risk_review
human_review_required
```

Not every candidate requires every validation type.

Resolve required validations from candidate type and policy.

---

# 6. CANDIDATE-SPECIFIC VALIDATION

## assumption_update

Require:

- evidence completeness;
- confidence threshold;
- cross-period consistency;
- contradiction check.

## threshold_update

Require:

- backtest;
- false-positive/false-negative impact;
- rollback threshold;
- policy review.

## forecast_calibration

Require:

- historical error comparison;
- out-of-sample test where data exists;
- degradation check.

## risk_model_update

Require:

- risk coverage;
- missed-risk analysis;
- adverse-outcome review;
- enhanced approval.

## decision_rule_update

Require:

- rule replay;
- conflicting-decision analysis;
- policy review;
- human approval.

## simulation_distribution_update

Require:

- distribution-fit test;
- seeded replay;
- sensitivity comparison;
- model-version impact.

## digital_twin_calibration

Require:

- twin replay;
- divergence comparison;
- stale-state check.

## operational_policy_update

Require:

- legal/policy review where applicable;
- business impact analysis;
- manual approval.

## data_quality_rule_update

Require:

- precision/recall or equivalent quality test;
- source impact analysis;
- rollback plan.

## no_change_recommended

No production update. May be approved and published as evidence only.

## insufficient_evidence

Cannot be approved for deployment. May be published as a learning finding requiring more evidence.

---

# 7. LEARNING VALIDATION SERVICE

Implement:

```ts
interface LearningValidationService {
  validateCandidate(
    candidateId: string,
    context: TenantContext
  ): Promise<LearningValidationResult>;
}
```

Required flow:

```text
load candidate
→ verify scope and state
→ resolve validation policy
→ move candidate to validating
→ execute required deterministic validations
→ persist validation runs and evidence
→ calculate validation outcome
→ move to validated or validation_failed
→ preserve limitations and unresolved risks
```

Requirements:

- validation is reproducible;
- validation inputs are versioned;
- validation code/version is persisted;
- random seed persisted where used;
- failures do not delete evidence;
- no production mutation occurs.

---

# 8. APPROVAL POLICY

Resolve approval level using:

```text
candidate type
target layer
risk level
confidence
scope
financial impact
customer impact
legal/policy impact
production criticality
```

Approval levels:

```text
automatic_rejection
single_human_approval
dual_human_approval
technical_and_business_approval
security_review_required
legal_review_required
board_or_executive_review
```

Important:

- `automatic_rejection` is allowed for policy-blocked candidates.
- Automatic approval is prohibited.
- Every deployable candidate requires at least one explicit human approval.
- High-risk candidates require enhanced approval.
- Approval identity, timestamp, role, and policy version must be persisted.

---

# 9. LEARNING APPROVAL SERVICE

Implement:

```ts
interface LearningApprovalService {
  requestApproval(
    candidateId: string,
    context: TenantContext
  ): Promise<LearningApprovalRequest>;

  recordDecision(
    approvalRequestId: string,
    decision: "approved" | "rejected",
    actor: ApprovalActor,
    reason: string,
    context: TenantContext
  ): Promise<LearningApprovalDecision>;
}
```

Rules:

- only validated candidates may enter approval;
- `insufficient_evidence` cannot be approved for deployment;
- approver cannot approve outside authorized scope;
- dual approval requires distinct actors;
- self-approval restrictions must follow policy;
- rejected candidates remain immutable except for a new version;
- approval does not deploy anything.

---

# 10. PUBLICATION BOUNDARY

Only approved candidates may be published.

Publication means:

```text
approved learning evidence and proposed change are made available
to authorized downstream consumers through a versioned feedback package
```

Publication does not mean:

```text
model deployed
prompt changed
threshold changed
policy changed
Digital Twin recalibrated
Simulation distribution replaced
ADI rule activated
ABA policy activated
```

---

# 11. LEARNING PUBLICATION SERVICE

Implement:

```ts
interface LearningPublicationService {
  publishApprovedCandidate(
    candidateId: string,
    context: TenantContext
  ): Promise<LearningPublicationResult>;
}
```

Required flow:

```text
load approved candidate
→ verify approval completeness
→ verify not revoked
→ verify target layer and contract
→ create immutable publication package
→ create target-specific feedback package
→ persist publication evidence
→ enqueue cl.learning.published
→ move candidate to published
→ commit
```

All writes and outbox publication must be atomic.

---

# 12. TARGET-SPECIFIC FEEDBACK PACKAGES

Support these package types where applicable:

```text
cl-to-da.data-quality-learning-package
cl-to-bo.operational-learning-package
cl-to-bi.analytics-calibration-package
cl-to-dt.digital-twin-calibration-package
cl-to-sim.simulation-calibration-package
cl-to-adi.decision-learning-package
cl-to-aba.approval-policy-learning-package
cl-to-om.monitoring-learning-package
```

Each package must include:

```text
publicationPackageId
learningCandidateId
candidateType
targetLayer
targetScope
proposedChangeReference
validationEvidenceReferences
approvalReferences
confidenceScore
limitations
rollbackRecommendation
effectiveFrom optional
expiresAt optional
provenanceReference
```

Do not embed executable code, credentials, or secrets.

---

# 13. OUTBOUND EVENT

Emit:

```text
cl.learning.published
```

Minimum payload:

```ts
{
  learningPublicationId: string;
  learningCandidateId: string;
  learningRequestId: string;
  businessId: string;
  candidateType: string;
  targetLayer:
    | "data_acquisition"
    | "business_operations"
    | "business_intelligence"
    | "business_digital_twin"
    | "simulation"
    | "ai_decision_intelligence"
    | "approved_business_action"
    | "outcome_monitoring";
  feedbackPackageId: string;
  confidenceScore: number;
  publishedAt: string;
}
```

Envelope requirements:

- same tenant/workspace/business;
- same correlation ID;
- causation ID references the learning request or approval event according to existing convention;
- aggregate type `learning_publication`;
- aggregate ID equals publication ID;
- registered version;
- payload validates.

---

# 14. IDEMPOTENCY

Protect using:

```text
incoming event ID
consumer name
learning request ID
candidate ID and version
validation run version
approval request ID
publication ID
feedback package version
```

Requirements:

- duplicate request does not duplicate validation;
- duplicate approval decision does not duplicate state transition;
- duplicate publication does not duplicate package or event;
- a new candidate version may be validated and published separately;
- revoked candidate cannot publish;
- published package remains immutable.

---

# 15. REVOCATION

Support controlled revocation:

```text
approved → revoked
published → revoked
```

Revocation must persist:

```text
reason
actor
timestamp
affected publication packages
replacement candidate optional
rollback recommendation
```

Emit the existing handoff or learning revocation event if present.

Do not automatically roll back upstream systems in this phase.

---

# 16. ERROR TYPES

Create controlled errors:

```text
LearningRequestNotFoundError
LearningCandidateNotFoundError
LearningCandidateStateError
LearningValidationPolicyError
LearningValidationFailedError
LearningApprovalPolicyError
LearningApprovalIncompleteError
LearningApproverUnauthorizedError
LearningDualApprovalError
LearningPublicationNotAllowedError
LearningTargetLayerError
LearningFeedbackMappingError
LearningCandidateRevokedError
DuplicateLearningPublicationError
LearningScopeMismatchError
```

Do not expose confidential evidence or reviewer data beyond authorized metadata.

---

# 17. OBSERVABILITY

Structured logs:

```text
cl_validation_received
cl_candidate_validation_started
cl_candidate_validation_completed
cl_candidate_validation_failed
cl_approval_requested
cl_approval_recorded
cl_candidate_approved
cl_candidate_rejected
cl_publication_started
cl_feedback_package_created
cl_learning_published
cl_candidate_revoked
cl_duplicate_ignored
cl_failed
```

Metrics:

```text
cl_validation_total
cl_validation_failure_total
cl_approval_requested_total
cl_approved_total
cl_rejected_total
cl_published_total
cl_revoked_total
cl_feedback_package_total
cl_high_risk_candidate_total
cl_processing_seconds
```

Include request, candidate, validation, approval, publication, feedback, target layer, scope, correlation, causation, actor role, status, duration, and failure code.

---

# 18. SECURITY AND SAFETY

Requirements:

- all access tenant/workspace scoped;
- application role cannot bypass RLS;
- approver authorization enforced;
- dual approval uses distinct identities;
- evidence access follows classification;
- no secrets, credentials, or executable payloads in feedback packages;
- no automatic approval;
- no automatic deployment;
- no direct upstream mutation;
- no silent model, prompt, rule, threshold, policy, or calibration changes;
- every publication has provenance, approval, validation, and rollback metadata;
- audit records are immutable.

---

# 19. TESTS

## Unit tests

- valid learning request;
- invalid state transitions;
- candidate-specific validation requirements;
- validation success and failure;
- insufficient-evidence restriction;
- no-change candidate handling;
- policy resolution;
- unauthorized approver rejection;
- dual approval distinct actors;
- publication blocked before approval;
- publication allowed after complete approval;
- target-package mapping;
- revocation;
- outbound event validation.

## Live PostgreSQL integration tests

- request starts validation;
- validation evidence persisted;
- candidate becomes validated;
- failed validation remains unpublished;
- approval request created;
- unauthorized approval rejected;
- single approval works where allowed;
- dual approval requires two actors;
- rejected candidate cannot publish;
- approved candidate publishes;
- feedback package created for each supported target type;
- publication and outbox event atomic;
- duplicate request idempotent;
- duplicate approval idempotent;
- duplicate publication idempotent;
- revoked candidate cannot publish;
- published candidate can be revoked;
- tenant A cannot access tenant B candidate;
- same-tenant cross-workspace blocked;
- missing context fails closed;
- no upstream production table is mutated;
- no deployment record is created;
- `cl.learning.published` emitted;
- correlation and causation preserved;
- audit records persisted.

## End-to-end test

Execute:

```text
insert valid CL learning request and proposed candidate
→ enqueue cl.learning.requested
→ relay runOnce()
→ deterministic validation completes
→ approval request created
→ authorized human approval recorded
→ publication service invoked
→ immutable feedback package created
→ candidate becomes published
→ cl.learning.published written to outbox
→ verify no upstream production mutation
```

Target:

```text
at least 80 meaningful tests
```

---

# 20. DOCUMENTATION

Create or update:

```text
docs/vertical-slices/cl-validation-publication.md
docs/learning-validation-policy.md
docs/learning-approval-policy.md
docs/learning-publication-boundary.md
docs/learning-feedback-packages.md
docs/learning-revocation.md
docs/continuous-learning-safety-controls.md
docs/continuous-learning-idempotency.md
docs/continuous-learning-security.md
apps/api/README.md
```

Document:

- input event;
- candidate states;
- validation types;
- candidate-specific requirements;
- approval levels;
- human approval requirement;
- publication meaning;
- target feedback packages;
- revocation;
- safety restrictions;
- idempotency;
- audit;
- observability;
- test setup;
- what remains for upstream feedback consumers.

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

Run API/eventing integration tests against PostgreSQL 16.

Do not use production credentials.

Do not claim completion unless the full validation → approval → publication end-to-end test passes.

---

# 22. PROHIBITED WORK

Do not implement:

- automatic model deployment;
- prompt mutation;
- threshold mutation;
- policy mutation;
- Digital Twin recalibration;
- Simulation distribution replacement;
- ADI rule activation;
- ABA policy activation;
- direct upstream database mutation;
- deployment workers;
- external adapters;
- replay execution;
- frontend.

---

# 23. STOP CONDITION

Stop after:

1. learning-request consumer exists;
2. candidate validation works;
3. validation evidence persists;
4. approval routing works;
5. human approval requirements work;
6. approved candidate publication works;
7. target-specific feedback packages work;
8. `cl.learning.published` works;
9. revocation works;
10. idempotency works;
11. no upstream production mutation occurs;
12. no deployment occurs;
13. RLS, audit, and rollback tests pass;
14. end-to-end test passes;
15. documentation is complete;
16. completion report is produced.

Do not begin upstream feedback consumers.

---

# 24. COMPLETION REPORT FORMAT

Return:

```text
EVENT BACKBONE PHASE 12 REPORT

Created:
- learning-request consumer
- candidate validator
- validation service
- approval service
- publication service
- feedback-package mapper
- policy resolver
- consumer registration
- errors
- tests
- documentation

Modified:
- exact files
- reason

Validation:
- command
- result

End-to-end verification:
- learning request inserted
- cl.learning.requested enqueued
- relay dispatch
- validation executed
- validation evidence persisted
- candidate validated
- approval request created
- human approval recorded
- publication package created
- target feedback package created
- cl.learning.published emitted
- correlation preserved
- causation preserved
- duplicate handling verified
- revocation verified
- rollback atomicity
- tenant isolation
- workspace isolation
- audit persistence
- no upstream production mutation
- no deployment record created

Totals:
- candidates validated
- approval requests
- approvals
- publications
- feedback packages
- target layers covered
- integration tests
- tests passing

Security:
- scoped CL access
- approver authorization
- dual-approval enforcement
- evidence classification
- automatic-approval prohibition
- deployment prohibition
- payload redaction
- RLS status

Not started:
- upstream feedback consumers
- automated deployment
- external adapters
- replay execution
- frontend

Risks or unresolved issues:
- exact issue
- impact
- recommended resolution

Next recommended task:
- Event Backbone Phase 13 — controlled upstream feedback consumers
```
