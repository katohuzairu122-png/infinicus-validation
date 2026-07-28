# INFINICUS EVENT BACKBONE — PHASE 9 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey:

1. `CLAUDE.md`
2. `INFINICUS-PLATFORM-EVENT-CATALOGUE.md`
3. `INFINICUS-LAYER-HANDOFF-CONTRACTS.md`
4. `INFINICUS-EVENT-BACKBONE-IMPLEMENTATION-PLAN.md`
5. Event Backbone Phases 1–8 implementations and reports
6. Database Stage 2G AI Decision Intelligence implementation
7. Database Stage 2H Approved Business Action implementation
8. Existing event, handoff, inbox, outbox, relay, and consumer patterns
9. Existing tenant-scoped PostgreSQL integration-test harness

## Objective

Implement Event Backbone Phase 9 only:

```text
ADI → ABA production approval-intake consumer
```

Implement the cross-layer path:

```text
adi.decision.generated
→ validate ADI recommendation package
→ validate adi-to-aba.approval-candidate-package
→ persist ABA approval candidate
→ register evidence, recommendation, alternatives, risks, confidence, and limitations
→ record inbox processing
→ acknowledge or reject handoff
→ emit aba.approval.requested
```

Use an existing canonical ABA intake event when already defined.

Do not implement:

- automatic approval;
- action execution;
- payment execution;
- external system calls;
- ABA → OM;
- replay execution;
- frontend;
- broad ABA block conversion.

Stop after the ADI → ABA approval-intake vertical slice is live-tested.

---

# 1. PRECONDITIONS

Confirm:

- Event Backbone Phases 1–8 pass;
- `adi.decision.generated` contract exists;
- the canonical ABA approval-intake event exists or is added through the Phase 1 registry pattern;
- `adi-to-aba.approval-candidate-package` exists;
- Stage 2G ADI decision persistence exists;
- Stage 2H ABA approval-candidate persistence exists;
- inbox, outbox, relay, and in-process adapter pass;
- Stage 2G and Stage 2H migration ranges are frozen;
- ADI and ABA RLS policies pass.

If Stage 2H has not been implemented, stop and report the missing prerequisite.

Do not create ABA tables ad hoc.

---

# 2. TARGET STRUCTURE

Create or complete:

```text
apps/api/src/eventing/consumers/adi-to-aba/
├── DecisionGeneratedConsumer.ts
├── AdiToAbaHandoffValidator.ts
├── ApprovalCandidateMapper.ts
├── ApprovalIntakeService.ts
├── ApprovalIntakePolicy.ts
├── AdiToAbaConsumerDefinition.ts
├── errors.ts
└── index.ts
```

Tests:

```text
apps/api/tests/eventing/adi-to-aba/
├── decision-generated.unit.test.ts
├── adi-to-aba-handoff.unit.test.ts
├── approval-candidate-mapper.unit.test.ts
├── approval-intake.integration.test.ts
├── approval-intake-idempotency.integration.test.ts
├── approval-intake-rls.integration.test.ts
└── approval-intake-failure.integration.test.ts
```

Follow established package conventions where they differ.

---

# 3. INPUT EVENT

Consume:

```text
adi.decision.generated
```

Expected minimum payload:

```ts
{
  decisionId: string;
  decisionRequestId: string;
  businessId: string;
  recommendationPackageId: string;
  recommendationType: string;
  confidenceScore: number;
  generatedAt: string;
  limitations: unknown[];
}
```

Reject when:

- event version unsupported;
- recommendation package missing;
- decision status is not generated/finalized;
- package revoked;
- tenant/workspace/business mismatch;
- confidence below policy;
- provenance incomplete;
- recommendation has no actionable candidate;
- policy-critical limitation unresolved;
- required explanation missing;
- package version already consumed.

---

# 4. HANDOFF CONTRACT

Use:

```text
adi-to-aba.approval-candidate-package
```

Expected payload:

```ts
{
  recommendationPackageId: string;
  decisionId: string;
  decisionRequestId: string;
  businessId: string;
  recommendedAction: {
    actionType: string;
    title: string;
    description: string;
    parameters: Record<string, unknown>;
    expectedOutcomeReferences: string[];
    estimatedCost?: {
      amount: number;
      currency: string;
    };
    timing?: {
      earliestStart?: string;
      latestStart?: string;
      expectedDurationMinutes?: number;
    };
  };
  alternatives: Array<{
    alternativeId: string;
    title: string;
    description: string;
    score?: number;
    reasonNotPreferred?: string;
  }>;
  evidenceReferences: string[];
  riskReferences: string[];
  confidenceScore: number;
  explanationReference: string;
  limitations: unknown[];
  provenanceReference: string;
}
```

Validate the complete handoff before ABA writes.

Do not bypass the recommendation package by scanning arbitrary ADI tables.

---

# 5. ACCEPTANCE POLICY

Default thresholds:

```text
ADI confidence >= 0.75
recommended action is structurally valid
at least one evidence reference
valid explanation reference
valid provenance
no policy-blocked action type
no critical unresolved limitation
matching tenant/workspace/business scope
```

Make thresholds and supported action types configurable.

Rejection codes:

```text
unsupported_version
schema_invalid
tenant_mismatch
workspace_mismatch
business_scope_invalid
decision_not_finalized
recommendation_package_not_found
recommendation_package_revoked
confidence_below_threshold
action_missing
action_invalid
action_type_not_supported
action_policy_blocked
evidence_missing
explanation_missing
provenance_incomplete
critical_limitation
duplicate_recommendation_package
```

---

# 6. APPROVAL BOUNDARY

ADI may recommend.

ABA owns:

```text
approval candidates
approval requests
approval policies
approval routes
approvers
approval decisions
authorization records
action instructions
execution commands
execution evidence
reversal and cancellation
```

This phase must not approve or execute anything.

The only allowed outcome is an approval candidate and approval request.

Do not interpret confidence as authorization.

Do not auto-approve high-confidence recommendations.

---

# 7. APPROVAL CANDIDATE MAPPER

Implement a deterministic mapper.

Map:

```text
recommended action
action parameters
expected outcomes
cost estimate
timing
alternatives
evidence references
risk references
confidence
explanation
limitations
provenance
```

Rules:

- preserve immutable source references;
- do not copy large evidence payloads unnecessarily;
- deterministic ordering of alternatives and references;
- reject duplicate alternative IDs;
- reject invalid monetary values;
- validate currency codes;
- validate timing ranges;
- remove or reject forbidden parameters;
- do not create execution credentials;
- do not call external systems;
- do not change recommendation meaning;
- preserve limitations.

---

# 8. APPROVAL INTAKE SERVICE

Implement:

```ts
interface ApprovalIntakeService {
  processDecisionGenerated(
    event: PlatformEvent<DecisionGeneratedPayload>,
    handoff: LayerHandoff<AiDecisionIntelligenceToApprovedBusinessActionPayload>,
    context: TenantContext
  ): Promise<ApprovalIntakeResult>;
}
```

Required transactional flow:

```text
validate event
→ validate handoff
→ begin tenant event transaction
→ begin inbox processing
→ detect duplicate
→ load ADI recommendation package
→ verify status, ownership, version, confidence, provenance, and policy
→ map approval candidate
→ create immutable approval candidate
→ create approval request in pending state
→ persist evidence, risk, alternative, explanation, and limitation references
→ resolve approval policy and route
→ persist handoff receipt
→ acknowledge handoff
→ enqueue aba.approval.requested
→ mark inbox processed
→ commit
```

On permanent failure:

```text
rollback domain writes
→ persist rejection through eventing path
→ return controlled error
```

---

# 9. APPROVAL REQUEST STATE

Initial state:

```text
pending
```

Allowed creation-time states:

```text
pending
policy_review_required
```

Do not create:

```text
approved
rejected
executed
completed
```

from this consumer.

Required fields:

```text
approvalRequestId
approvalCandidateId
businessId
policyId
approvalRouteId
status
requestedAt
expiresAt optional
```

---

# 10. APPROVAL POLICY RESOLUTION

Resolve the applicable policy using:

```text
tenant
workspace
business
action type
estimated cost
risk classification
data sensitivity
jurisdiction where available
```

Policy resolution outcomes:

```text
standard_approval
enhanced_approval
manual_review_required
blocked
```

Rules:

- blocked action is rejected;
- manual review creates `policy_review_required`;
- no policy match fails closed;
- policy version is persisted;
- route and required approvers are references only in this phase;
- no approver response is generated.

---

# 11. IDEMPOTENCY

Protect using:

```text
incoming event ID
consumer name
recommendation package ID
recommendation package version
decision ID
approval candidate ID
approval request ID
```

Requirements:

- duplicate event does not duplicate candidate;
- duplicate package version does not duplicate request;
- repeated relay delivery does not duplicate `aba.approval.requested`;
- newer package version may create a new candidate version;
- revoked package cannot process;
- acknowledged package returns idempotent no-op.

---

# 12. OUTBOUND EVENT

Emit:

```text
aba.approval.requested
```

Minimum payload:

```ts
{
  approvalRequestId: string;
  approvalCandidateId: string;
  decisionId: string;
  recommendationPackageId: string;
  businessId: string;
  actionType: string;
  policyId: string;
  approvalRouteId: string;
  status: "pending" | "policy_review_required";
  confidenceScore: number;
  requestedAt: string;
  expiresAt?: string;
}
```

Envelope requirements:

- same tenant/workspace/business;
- same correlation ID;
- causation ID equals incoming ADI event ID;
- aggregate type `approval_request`;
- aggregate ID equals approval request ID;
- registered version;
- payload validates.

Do not emit:

```text
aba.action.approved
aba.action.executed
```

in this phase.

---

# 13. HANDOFF ACKNOWLEDGEMENT AND REJECTION

On success, persist and publish:

```text
platform.handoff.acknowledged
```

Target references must include:

```text
approvalCandidateId
approvalRequestId
policyId
approvalRouteId
```

On permanent rejection, persist and publish:

```text
platform.handoff.rejected
```

Acknowledgement and rejection must be mutually exclusive for the same package version.

---

# 14. ERROR TYPES

Create controlled errors:

```text
DecisionRecommendationPackageNotFoundError
DecisionNotFinalizedError
DecisionRecommendationPackageRevokedError
DecisionConfidenceError
DecisionProvenanceError
ApprovalCandidateMappingError
ApprovalPolicyNotFoundError
ApprovalPolicyBlockedError
ApprovalRouteNotFoundError
ApprovalScopeMismatchError
DuplicateApprovalIntakeError
InvalidActionParametersError
InvalidEstimatedCostError
InvalidActionTimingError
```

Do not expose confidential decision evidence or action parameters in errors.

---

# 15. OBSERVABILITY

Structured logs:

```text
adi_to_aba_received
adi_to_aba_validated
adi_to_aba_duplicate_ignored
adi_to_aba_candidate_created
adi_to_aba_policy_resolved
adi_to_aba_request_created
adi_to_aba_acknowledged
adi_to_aba_rejected
adi_to_aba_failed
```

Required fields:

```text
eventId
handoffId
decisionId
decisionRequestId
recommendationPackageId
approvalCandidateId
approvalRequestId
policyId
approvalRouteId
tenantId
workspaceId
businessId
correlationId
causationId
consumerName
actionType
confidenceScore
status
durationMs
failureCode
```

Metrics:

```text
adi_to_aba_received_total
adi_to_aba_processed_total
adi_to_aba_rejected_total
adi_to_aba_duplicate_total
adi_to_aba_failure_total
adi_to_aba_policy_blocked_total
adi_to_aba_manual_review_total
adi_to_aba_processing_seconds
```

---

# 16. SECURITY

Requirements:

- no unscoped ADI or ABA queries;
- all writes inside tenant transactions;
- event, handoff, recommendation, decision, candidate, and approval scope must match;
- same-tenant cross-workspace access blocked;
- no raw evidence or confidential parameters in logs;
- forbidden action parameters rejected;
- no secrets, credentials, tokens, or payment instruments in event payloads;
- policy resolution fails closed;
- application role cannot bypass RLS;
- no automatic approval;
- no action execution.

---

# 17. TESTS

## Unit tests

- valid decision event;
- unsupported version rejected;
- confidence threshold;
- missing action rejected;
- unsupported action type rejected;
- blocked action rejected;
- missing evidence rejected;
- missing explanation rejected;
- invalid cost rejected;
- invalid currency rejected;
- invalid timing rejected;
- deterministic mapping;
- duplicate alternatives rejected;
- policy resolution;
- manual-review state;
- outbound approval-request event validates;
- acknowledgement validates;
- rejection validates.

## Live PostgreSQL integration tests

- valid ADI package creates approval candidate;
- approval request created as pending;
- evidence references persisted;
- risk references persisted;
- alternatives persisted;
- explanation reference persisted;
- limitations persisted;
- policy and route references persisted;
- duplicate event idempotent;
- duplicate package version idempotent;
- newer package version creates new candidate version;
- revoked package rejected;
- low-confidence recommendation rejected;
- missing provenance rejected;
- unsupported action type rejected;
- blocked policy rejected;
- missing policy fails closed;
- manual-review policy creates `policy_review_required`;
- tenant A cannot process tenant B recommendation;
- same-tenant cross-workspace blocked;
- missing context fails closed;
- rollback removes ABA records and outbound event;
- `aba.approval.requested` emitted;
- causation ID equals ADI event ID;
- correlation ID preserved;
- acknowledgement persisted;
- permanent rejection persisted;
- relay dispatch reaches ADI → ABA consumer;
- no approved or executed record is created.

## End-to-end test

Execute:

```text
insert finalized ADI recommendation package
→ enqueue adi.decision.generated
→ relay runOnce()
→ ADI → ABA consumer
→ approval candidate persisted
→ approval request created as pending
→ policy and route resolved
→ handoff acknowledged
→ aba.approval.requested written to outbox
```

Target:

```text
at least 60 meaningful tests
```

---

# 18. DOCUMENTATION

Create or update:

```text
docs/vertical-slices/adi-to-aba.md
docs/adi-to-aba-mapping.md
docs/approval-intake-policy.md
docs/approval-intake-idempotency.md
docs/approval-intake-security.md
docs/approval-boundary.md
apps/api/README.md
```

Document:

- input event;
- handoff contract;
- approval boundary;
- acceptance policy;
- candidate mapping;
- policy resolution;
- initial request states;
- transaction flow;
- idempotency;
- acknowledgement and rejection;
- outbound approval request event;
- observability;
- test setup;
- what remains for approval decisions and action execution.

---

# 19. VALIDATION COMMANDS

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

Do not claim completion unless the ADI → ABA end-to-end test passes.

---

# 20. PROHIBITED WORK

Do not implement:

- automatic approval;
- approver response;
- `aba.action.approved`;
- action execution;
- payments;
- external system calls;
- ABA → OM;
- replay execution;
- frontend;
- broad ABA TypeScript conversion.

---

# 21. STOP CONDITION

Stop after:

1. ADI → ABA consumer exists;
2. event and handoff validation work;
3. approval candidate persistence works;
4. approval request is created only as pending or policy-review-required;
5. policy and route resolution work;
6. evidence and alternatives are referenced;
7. idempotency works;
8. acknowledgement and rejection work;
9. `aba.approval.requested` works;
10. no automatic approval or execution occurs;
11. RLS and rollback tests pass;
12. relay end-to-end test passes;
13. documentation is complete;
14. completion report is produced.

Do not begin Event Backbone Phase 10.

---

# 22. COMPLETION REPORT FORMAT

Return:

```text
EVENT BACKBONE PHASE 9 REPORT

Created:
- ADI → ABA consumer
- handoff validator
- approval candidate mapper
- approval intake service
- approval policy resolver
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
- ADI recommendation package inserted
- adi.decision.generated enqueued
- relay dispatch
- approval candidate created
- approval request created
- initial status verified
- policy resolved
- route resolved
- evidence/risk/alternative references registered
- handoff acknowledged
- aba.approval.requested emitted
- correlation preserved
- causation preserved
- duplicate delivery idempotent
- rollback atomicity
- tenant isolation
- workspace isolation
- no automatic approval
- no action execution

Totals:
- consumers
- approval candidates
- approval requests
- policies tested
- integration tests
- tests passing

Security:
- scoped ADI and ABA access
- sensitive-parameter handling
- policy fail-closed behavior
- automatic-approval prohibition
- payload redaction
- RLS status

Not started:
- approver decisions
- action approval
- action execution
- ABA → OM
- replay execution
- external adapters
- frontend

Risks or unresolved issues:
- exact issue
- impact
- recommended resolution

Next recommended task:
- Event Backbone Phase 10 — ABA → OM execution and outcome-intake boundary
```
