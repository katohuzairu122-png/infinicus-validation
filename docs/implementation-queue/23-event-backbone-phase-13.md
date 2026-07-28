# INFINICUS EVENT BACKBONE — PHASE 13 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey:

1. `CLAUDE.md`
2. `INFINICUS-PLATFORM-EVENT-CATALOGUE.md`
3. `INFINICUS-LAYER-HANDOFF-CONTRACTS.md`
4. `INFINICUS-EVENT-BACKBONE-IMPLEMENTATION-PLAN.md`
5. Event Backbone Phases 1–12 implementations and reports
6. Database Stages 2A–2J implementations and frozen migration manifests
7. Existing Continuous Learning validation, approval, publication, revocation, and feedback-package implementation
8. Existing event, handoff, inbox, outbox, relay, consumer, audit, and RLS patterns
9. Existing tenant-scoped PostgreSQL integration-test harness

## Objective

Implement Event Backbone Phase 13 only:

```text
Controlled upstream feedback consumers
```

Consume approved and published Continuous Learning packages through explicit, target-specific intake boundaries:

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

Required principle:

```text
published learning
→ target-layer review intake
→ compatibility and safety validation
→ proposed target-layer change
→ explicit target-layer approval where required
```

Do not directly activate, deploy, or mutate production behavior.

Stop after all eight target-specific feedback intake consumers are implemented and live-tested.

---

# 1. PRECONDITIONS

Confirm:

- Event Backbone Phases 1–12 pass.
- `cl.learning.published` exists.
- All eight target-specific CL feedback package contracts exist.
- Published learning candidates contain validation, approval, provenance, limitations, rollback, and target-scope metadata.
- Target-layer intake, review, proposal, or calibration-candidate persistence exists.
- Inbox, outbox, relay, dead-letter, audit, and RLS pass.
- Database migrations are frozen.

If a target layer lacks required intake persistence, stop that consumer and report the missing prerequisite.

Do not create production-activation tables ad hoc.

---

# 2. TARGET STRUCTURE

Create:

```text
apps/api/src/eventing/consumers/cl-feedback/
├── shared/
│   ├── ClFeedbackEnvelopeValidator.ts
│   ├── ClFeedbackCompatibilityPolicy.ts
│   ├── ClFeedbackIntakeService.ts
│   ├── ClFeedbackErrors.ts
│   └── index.ts
├── cl-to-da/
│   ├── ClToDaConsumer.ts
│   ├── DataQualityLearningMapper.ts
│   └── index.ts
├── cl-to-bo/
│   ├── ClToBoConsumer.ts
│   ├── OperationalLearningMapper.ts
│   └── index.ts
├── cl-to-bi/
│   ├── ClToBiConsumer.ts
│   ├── AnalyticsCalibrationMapper.ts
│   └── index.ts
├── cl-to-dt/
│   ├── ClToDtConsumer.ts
│   ├── DigitalTwinCalibrationMapper.ts
│   └── index.ts
├── cl-to-sim/
│   ├── ClToSimConsumer.ts
│   ├── SimulationCalibrationMapper.ts
│   └── index.ts
├── cl-to-adi/
│   ├── ClToAdiConsumer.ts
│   ├── DecisionLearningMapper.ts
│   └── index.ts
├── cl-to-aba/
│   ├── ClToAbaConsumer.ts
│   ├── ApprovalPolicyLearningMapper.ts
│   └── index.ts
├── cl-to-om/
│   ├── ClToOmConsumer.ts
│   ├── MonitoringLearningMapper.ts
│   └── index.ts
├── ClFeedbackConsumerDefinitions.ts
└── index.ts
```

Tests:

```text
apps/api/tests/eventing/cl-feedback/
├── shared-policy.unit.test.ts
├── cl-to-da.integration.test.ts
├── cl-to-bo.integration.test.ts
├── cl-to-bi.integration.test.ts
├── cl-to-dt.integration.test.ts
├── cl-to-sim.integration.test.ts
├── cl-to-adi.integration.test.ts
├── cl-to-aba.integration.test.ts
├── cl-to-om.integration.test.ts
├── cl-feedback-idempotency.integration.test.ts
├── cl-feedback-rls.integration.test.ts
└── cl-feedback-failure.integration.test.ts
```

---

# 3. INPUT EVENT

Consume:

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

Reject when:

- version unsupported;
- publication missing or revoked;
- target layer does not match consumer;
- feedback package missing;
- tenant/workspace/business mismatch;
- publication lacks validation evidence;
- approval evidence incomplete;
- provenance incomplete;
- rollback recommendation missing where required;
- target scope invalid;
- package expired;
- duplicate package version already processed.

---

# 4. SHARED FEEDBACK PACKAGE REQUIREMENTS

Every feedback package must include:

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

Shared validation must verify:

- publication is approved;
- publication is not revoked;
- candidate type is supported by the target;
- target scope matches event and package scope;
- validation and approval references exist;
- confidence meets target policy;
- limitations are explicit;
- rollback recommendation is structurally valid;
- no executable code, secret, token, credential, or binary payload exists;
- package version is supported.

---

# 5. COMMON TARGET INTAKE STATES

Use controlled intake states:

```text
received
validating
accepted_for_review
rejected
requires_more_evidence
superseded
revoked
```

Do not create:

```text
active
deployed
production
applied
```

from Phase 13 consumers.

Each consumer creates a target-layer review proposal only.

---

# 6. CL → DA

Consume:

```text
cl-to-da.data-quality-learning-package
```

Allowed candidate types:

```text
data_quality_rule_update
assumption_update
no_change_recommended
insufficient_evidence
```

Create:

```text
DA feedback intake
data-quality rule proposal
source-impact assessment
validation evidence references
rollback recommendation
```

Do not modify active collection, validation, normalization, or enrichment rules.

Recommended outbound event:

```text
da.learning_feedback.received
```

Use the existing canonical equivalent if present.

---

# 7. CL → BO

Consume:

```text
cl-to-bo.operational-learning-package
```

Allowed candidate types:

```text
operational_policy_update
threshold_update
assumption_update
no_change_recommended
insufficient_evidence
```

Create:

```text
BO feedback intake
operational-policy proposal
affected workflow/domain references
business impact assessment
rollback recommendation
```

Do not change operating workflows, prices, inventory rules, workforce rules, or policies automatically.

Recommended outbound event:

```text
bo.learning_feedback.received
```

---

# 8. CL → BI

Consume:

```text
cl-to-bi.analytics-calibration-package
```

Allowed candidate types:

```text
forecast_calibration
threshold_update
risk_model_update
assumption_update
no_change_recommended
insufficient_evidence
```

Create:

```text
BI feedback intake
analytics calibration proposal
metric/model references
historical validation references
degradation and rollback criteria
```

Do not replace active forecasts, anomaly thresholds, metrics, or analytical models.

Recommended outbound event:

```text
bi.learning_feedback.received
```

---

# 9. CL → DT

Consume:

```text
cl-to-dt.digital-twin-calibration-package
```

Allowed candidate types:

```text
digital_twin_calibration
assumption_update
threshold_update
no_change_recommended
insufficient_evidence
```

Create:

```text
DT feedback intake
calibration proposal
target twin/entity/state references
replay evidence
divergence comparison
rollback recommendation
```

Do not mutate current twin state, assumptions, constraints, entities, or relationships.

Recommended outbound event:

```text
dt.learning_feedback.received
```

---

# 10. CL → SIM

Consume:

```text
cl-to-sim.simulation-calibration-package
```

Allowed candidate types:

```text
simulation_distribution_update
forecast_calibration
assumption_update
threshold_update
risk_model_update
no_change_recommended
insufficient_evidence
```

Create:

```text
SIM feedback intake
simulation calibration proposal
engine/model/distribution references
seeded replay evidence
sensitivity comparison
rollback recommendation
```

Do not change Engine v3 behavior, active distributions, assumptions, scenario logic, or verdict support.

Recommended outbound event:

```text
sim.learning_feedback.received
```

---

# 11. CL → ADI

Consume:

```text
cl-to-adi.decision-learning-package
```

Allowed candidate types:

```text
decision_rule_update
threshold_update
risk_model_update
assumption_update
no_change_recommended
insufficient_evidence
```

Create:

```text
ADI feedback intake
decision-rule proposal
candidate scoring/ranking impact references
decision replay evidence
explanation and rollback requirements
```

Do not alter active prompts, weights, rules, scoring, ranking, explanations, or recommendation policies.

Recommended outbound event:

```text
adi.learning_feedback.received
```

---

# 12. CL → ABA

Consume:

```text
cl-to-aba.approval-policy-learning-package
```

Allowed candidate types:

```text
operational_policy_update
threshold_update
risk_model_update
decision_rule_update
no_change_recommended
insufficient_evidence
```

Create:

```text
ABA feedback intake
approval-policy proposal
approval-route impact
risk and authorization impact
enhanced review requirement
rollback recommendation
```

Do not change approval policies, routes, authorization requirements, execution controls, or automatic-approval settings.

Every deployable ABA proposal requires enhanced human review.

Recommended outbound event:

```text
aba.learning_feedback.received
```

---

# 13. CL → OM

Consume:

```text
cl-to-om.monitoring-learning-package
```

Allowed candidate types:

```text
threshold_update
assumption_update
data_quality_rule_update
operational_policy_update
no_change_recommended
insufficient_evidence
```

Create:

```text
OM feedback intake
monitoring-rule proposal
baseline/variance/alert impact references
historical comparison
rollback recommendation
```

Do not alter active baselines, observation windows, alert thresholds, attribution rules, or outcome scoring.

Recommended outbound event:

```text
om.learning_feedback.received
```

---

# 14. SHARED INTAKE SERVICE

Implement:

```ts
interface ClFeedbackIntakeService {
  processPublishedLearning(
    event: PlatformEvent<LearningPublishedPayload>,
    feedbackPackage: LayerHandoff<ContinuousLearningFeedbackPayload>,
    context: TenantContext
  ): Promise<ClFeedbackIntakeResult>;
}
```

Required transactional flow:

```text
validate event
→ resolve target consumer
→ validate target feedback package
→ begin tenant event transaction
→ begin inbox processing
→ detect duplicate
→ verify publication, approval, validation, provenance, scope, and revocation
→ apply target compatibility policy
→ map target review proposal
→ persist target-layer intake and proposal
→ persist handoff receipt
→ acknowledge or reject handoff
→ enqueue target learning-feedback-received event
→ mark inbox processed
→ commit
```

No production mutation is permitted.

---

# 15. TARGET COMPATIBILITY POLICY

Validate:

```text
candidate type supported
target contract version supported
target component/version exists
effective date valid
package not expired
confidence threshold met
validation type sufficient
approval level sufficient
rollback plan present
scope authorized
```

Outcomes:

```text
accepted_for_review
requires_more_evidence
rejected
```

A package may be published by CL but still be rejected by a target layer for incompatibility.

---

# 16. IDEMPOTENCY

Protect using:

```text
incoming event ID
consumer name
learning publication ID
feedback package ID and version
learning candidate ID and version
target layer
target proposal ID
```

Requirements:

- duplicate event does not duplicate intake;
- duplicate package version does not duplicate proposal;
- repeated relay delivery does not duplicate outbound target event;
- newer package version may create a superseding proposal;
- revoked package cannot process;
- acknowledged package returns idempotent no-op.

---

# 17. HANDOFF ACKNOWLEDGEMENT AND REJECTION

On accepted or requires-more-evidence intake, persist the applicable target receipt.

Use:

```text
platform.handoff.acknowledged
```

only when the target successfully accepts custody of the package.

Use:

```text
platform.handoff.rejected
```

for permanent incompatibility or safety failure.

Acceptance for review does not mean activation.

Target references include:

```text
feedbackIntakeId
targetProposalId
targetLayer
intakeStatus
```

---

# 18. OUTBOUND TARGET EVENTS

Use canonical equivalents when already defined:

```text
da.learning_feedback.received
bo.learning_feedback.received
bi.learning_feedback.received
dt.learning_feedback.received
sim.learning_feedback.received
adi.learning_feedback.received
aba.learning_feedback.received
om.learning_feedback.received
```

Minimum shared payload:

```ts
{
  feedbackIntakeId: string;
  targetProposalId: string;
  learningPublicationId: string;
  learningCandidateId: string;
  feedbackPackageId: string;
  businessId: string;
  candidateType: string;
  intakeStatus:
    | "accepted_for_review"
    | "requires_more_evidence";
  receivedAt: string;
}
```

Do not emit activation, deployment, calibration-completed, policy-updated, or model-updated events.

---

# 19. REVOCATION HANDLING

When a published CL package is revoked:

- mark unactivated target proposal revoked;
- block future review or activation;
- preserve history;
- record revocation reason and source;
- emit target feedback-revoked event only if canonical;
- do not automatically roll back an already activated change because activation is outside Phase 13.

Test revocation before and after intake.

---

# 20. ERRORS

Create controlled errors:

```text
LearningPublicationNotFoundError
LearningPublicationRevokedError
LearningFeedbackPackageNotFoundError
LearningFeedbackPackageExpiredError
LearningFeedbackTargetMismatchError
LearningFeedbackCandidateUnsupportedError
LearningFeedbackCompatibilityError
LearningFeedbackApprovalIncompleteError
LearningFeedbackValidationInsufficientError
LearningFeedbackRollbackMissingError
LearningFeedbackScopeMismatchError
DuplicateLearningFeedbackIntakeError
```

Do not expose confidential evidence, approver identity details, or proposed sensitive parameters.

---

# 21. OBSERVABILITY

Structured logs:

```text
cl_feedback_received
cl_feedback_validated
cl_feedback_compatible
cl_feedback_requires_more_evidence
cl_feedback_rejected
cl_feedback_intake_created
cl_feedback_proposal_created
cl_feedback_acknowledged
cl_feedback_revoked
cl_feedback_duplicate_ignored
cl_feedback_failed
```

Required dimensions:

```text
eventId
handoffId
learningPublicationId
learningCandidateId
feedbackPackageId
feedbackIntakeId
targetProposalId
targetLayer
candidateType
tenantId
workspaceId
businessId
correlationId
causationId
consumerName
intakeStatus
durationMs
failureCode
```

Metrics:

```text
cl_feedback_received_total
cl_feedback_accepted_total
cl_feedback_more_evidence_total
cl_feedback_rejected_total
cl_feedback_revoked_total
cl_feedback_duplicate_total
cl_feedback_failure_total
cl_feedback_processing_seconds
```

Label metrics by target layer without using high-cardinality identifiers.

---

# 22. SECURITY AND SAFETY

Requirements:

- all reads and writes are tenant/workspace scoped;
- application role cannot bypass RLS;
- target scope must match event and package;
- no direct production mutation;
- no automatic activation;
- no automatic deployment;
- no executable code in feedback packages;
- no secrets, credentials, tokens, or binary payloads;
- preserve validation, approval, provenance, limitations, and rollback references;
- sensitive proposals are not logged;
- ABA and other high-risk proposals require enhanced review;
- all intake and proposal records are auditable and immutable by history.

---

# 23. TESTS

## Shared unit tests

- target routing;
- target mismatch rejection;
- unsupported candidate rejection;
- expired package rejection;
- revoked package rejection;
- missing approval evidence;
- insufficient validation evidence;
- missing rollback plan;
- scope mismatch;
- deterministic mapping;
- outbound target event validation;
- no activation fields in outputs.

## Target integration tests

For each of DA, BO, BI, DT, SIM, ADI, ABA, and OM:

- valid feedback creates intake;
- target proposal created;
- intake state is `accepted_for_review`;
- insufficient evidence produces `requires_more_evidence`;
- unsupported candidate rejected;
- duplicate delivery idempotent;
- newer package version supersedes prior proposal;
- revoked package blocked;
- target event emitted;
- no production table mutated.

## Cross-cutting tests

- tenant A cannot access tenant B package;
- same-tenant cross-workspace blocked;
- missing context fails closed;
- rollback removes intake, proposal, acknowledgement, and outbound event;
- correlation preserved;
- causation preserved;
- all eight consumers registered;
- relay dispatch resolves correct target consumer;
- revocation updates proposal state;
- no activation/deployment event emitted.

## End-to-end test

For each target:

```text
insert approved and published CL feedback package
→ enqueue cl.learning.published
→ relay runOnce()
→ resolve target consumer
→ validate compatibility and safety
→ create target feedback intake
→ create target review proposal
→ acknowledge custody
→ emit target learning_feedback.received
→ verify no production mutation
```

Target:

```text
at least 120 meaningful tests
```

---

# 24. DOCUMENTATION

Create or update:

```text
docs/vertical-slices/cl-feedback-consumers.md
docs/cl-feedback-shared-policy.md
docs/cl-to-da-feedback.md
docs/cl-to-bo-feedback.md
docs/cl-to-bi-feedback.md
docs/cl-to-dt-feedback.md
docs/cl-to-sim-feedback.md
docs/cl-to-adi-feedback.md
docs/cl-to-aba-feedback.md
docs/cl-to-om-feedback.md
docs/cl-feedback-idempotency.md
docs/cl-feedback-revocation.md
docs/cl-feedback-security.md
docs/cl-feedback-non-activation-boundary.md
apps/api/README.md
```

Document:

- eight target contracts;
- supported candidate types;
- compatibility policy;
- intake states;
- target proposal meaning;
- acknowledgement versus activation;
- revocation;
- idempotency;
- security;
- observability;
- tests;
- remaining activation/deployment boundary.

---

# 25. VALIDATION COMMANDS

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

Do not claim completion unless all eight target end-to-end tests pass.

---

# 26. PROHIBITED WORK

Do not implement:

- DA rule activation;
- BO policy activation;
- BI model or threshold activation;
- DT calibration activation;
- SIM distribution or assumption activation;
- ADI prompt, score, rank, or rule activation;
- ABA approval-policy activation;
- OM baseline, alert, attribution, or scoring activation;
- direct upstream mutation;
- deployment workers;
- external adapters;
- replay execution;
- frontend.

---

# 27. STOP CONDITION

Stop after:

1. all eight feedback consumers exist;
2. shared compatibility policy works;
3. target-specific mapping works;
4. intake and proposal persistence work;
5. idempotency works;
6. acknowledgement and rejection work;
7. revocation handling works;
8. target receipt events work;
9. no production mutation occurs;
10. no activation or deployment occurs;
11. RLS, audit, and rollback tests pass;
12. all eight end-to-end tests pass;
13. documentation is complete;
14. completion report is produced.

Do not begin production activation or deployment workflows.

---

# 28. COMPLETION REPORT FORMAT

Return:

```text
EVENT BACKBONE PHASE 13 REPORT

Created:
- shared CL feedback validator
- compatibility policy
- shared intake service
- CL → DA consumer
- CL → BO consumer
- CL → BI consumer
- CL → DT consumer
- CL → SIM consumer
- CL → ADI consumer
- CL → ABA consumer
- CL → OM consumer
- target mappers
- consumer registrations
- errors
- tests
- documentation

Modified:
- exact files
- reason

Validation:
- command
- result

End-to-end verification by target:
- DA
- BO
- BI
- DT
- SIM
- ADI
- ABA
- OM

For each target report:
- publication inserted
- cl.learning.published enqueued
- relay dispatch
- target intake created
- target proposal created
- intake status
- handoff acknowledgement or rejection
- target receipt event emitted
- idempotency
- rollback
- tenant isolation
- workspace isolation
- no production mutation
- no activation
- no deployment

Totals:
- consumers
- target layers
- feedback intakes
- proposals
- acknowledgements
- rejections
- revocations
- integration tests
- tests passing

Security:
- scoped access
- compatibility enforcement
- evidence and approval verification
- rollback metadata
- sensitive proposal handling
- non-activation enforcement
- RLS status

Not started:
- target-layer activation approvals
- controlled deployments
- external adapters
- replay execution
- frontend

Risks or unresolved issues:
- exact issue
- impact
- recommended resolution

Next recommended task:
- Event Backbone closure audit and first complete end-to-end platform cycle
```
