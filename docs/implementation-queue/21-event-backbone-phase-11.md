# INFINICUS EVENT BACKBONE — PHASE 11 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey:

1. `CLAUDE.md`
2. `INFINICUS-PLATFORM-EVENT-CATALOGUE.md`
3. `INFINICUS-LAYER-HANDOFF-CONTRACTS.md`
4. `INFINICUS-EVENT-BACKBONE-IMPLEMENTATION-PLAN.md`
5. Event Backbone Phases 1–10 implementations and reports
6. Database Stage 2I Outcome Monitoring implementation
7. Database Stage 2J Continuous Learning implementation
8. Existing event, handoff, inbox, outbox, relay, outcome, and learning patterns
9. Existing tenant-scoped PostgreSQL integration-test harness

## Objective

Implement Event Backbone Phase 11 only:

```text
OM → CL production learning-intake boundary
```

Implement the cross-layer path:

```text
om.outcome.recorded
→ validate finalized outcome package
→ validate om-to-cl.learning-evidence-package
→ persist CL learning-intake package
→ register expected-vs-actual evidence, variance, attribution, confidence, and limitations
→ record inbox processing
→ acknowledge or reject handoff
→ emit cl.learning.requested
```

Use an existing canonical Continuous Learning intake event when already defined.

Do not invent a competing event when an equivalent already exists.

Do not implement automatic model updates, prompt updates, policy updates, production deployment, CL feedback publication, replay execution, external adapters, frontend, or broad CL conversion.

Stop after the OM → CL learning-intake vertical slice is live-tested.

## 1. Preconditions

Confirm:

- Event Backbone Phases 1–10 pass.
- `om.outcome.recorded` exists.
- The canonical CL intake event exists or is added through the Phase 1 registry pattern.
- `om-to-cl.learning-evidence-package` exists.
- Stage 2I finalized outcome persistence exists.
- Stage 2J learning-intake and learning-candidate persistence exists.
- Inbox, outbox, relay, and in-process adapter pass.
- Stage 2I and 2J migration ranges are frozen.
- OM and CL RLS policies pass.

If Stage 2J is absent, stop and report the prerequisite. Do not create CL tables ad hoc.

## 2. Target structure

```text
apps/api/src/eventing/consumers/om-to-cl/
├── OutcomeRecordedConsumer.ts
├── OmToClHandoffValidator.ts
├── LearningEvidenceMapper.ts
├── LearningIntakeService.ts
├── LearningIntakePolicy.ts
├── OmToClConsumerDefinition.ts
├── errors.ts
└── index.ts
```

Tests:

```text
apps/api/tests/eventing/om-to-cl/
├── outcome-recorded.unit.test.ts
├── om-to-cl-handoff.unit.test.ts
├── learning-evidence-mapper.unit.test.ts
├── learning-intake.integration.test.ts
├── learning-intake-idempotency.integration.test.ts
├── learning-intake-rls.integration.test.ts
└── learning-intake-failure.integration.test.ts
```

## 3. Input event

Consume:

```text
om.outcome.recorded
```

Minimum payload:

```ts
{
  outcomeRecordId: string;
  monitoringPlanId: string;
  approvedActionId: string;
  decisionId: string;
  businessId: string;
  outcomePackageId: string;
  outcomeStatus:
    | "achieved"
    | "partially_achieved"
    | "not_achieved"
    | "inconclusive"
    | "adverse";
  confidenceScore: number;
  recordedAt: string;
  limitations: unknown[];
}
```

Reject when the version is unsupported, outcome is not finalized, package is missing/revoked, scope mismatches, confidence is below policy, provenance is incomplete, expected-vs-actual comparison is missing, attribution is invalid, a critical limitation remains, or the package version was already consumed.

## 4. Handoff contract

Use:

```text
om-to-cl.learning-evidence-package
```

Expected payload:

```ts
{
  outcomePackageId: string;
  outcomeRecordId: string;
  monitoringPlanId: string;
  approvedActionId: string;
  decisionId: string;
  businessId: string;
  actionType: string;
  outcomeStatus:
    | "achieved"
    | "partially_achieved"
    | "not_achieved"
    | "inconclusive"
    | "adverse";
  expectedOutcomes: Array<{
    outcomeDefinitionId: string;
    metricReference: string;
    expectedValue?: unknown;
    actualValue?: unknown;
    variance?: unknown;
    tolerance?: unknown;
    status: "met" | "partially_met" | "not_met" | "inconclusive";
    confidenceScore: number;
    observationReferences: string[];
  }>;
  attribution: {
    status: "supported" | "partially_supported" | "unsupported" | "inconclusive";
    confidenceScore: number;
    factorReferences: string[];
    confounderReferences: string[];
  };
  executionEvidenceReferences: string[];
  riskOutcomeReferences: string[];
  alertReferences?: string[];
  confidenceScore: number;
  limitations: unknown[];
  provenanceReference: string;
}
```

Validate the complete handoff before CL writes. Do not bypass it by scanning arbitrary OM tables.

## 5. Acceptance policy

Defaults:

```text
overall outcome confidence >= 0.70
attribution confidence >= 0.60 when attribution is claimed
at least one expected-vs-actual record
valid observation evidence
valid provenance
no critical unresolved limitation
matching tenant/workspace/business scope
```

`inconclusive` outcomes remain admissible when evidence and limitations are explicit.

Make thresholds configurable.

Rejection codes:

```text
unsupported_version
schema_invalid
tenant_mismatch
workspace_mismatch
business_scope_invalid
outcome_not_finalized
outcome_package_not_found
outcome_package_revoked
confidence_below_threshold
comparison_missing
observation_evidence_missing
attribution_invalid
attribution_confidence_below_threshold
provenance_incomplete
critical_limitation
duplicate_outcome_package
```

## 6. Ownership boundary

OM owns monitoring, observations, comparison, variance, attribution, outcome status, alerts, evidence, and publication.

CL owns learning intake, evidence packages, hypotheses, candidate updates, validation experiments, learning confidence, approval requests, approved learning publication, and upstream feedback packages.

This phase must not update models, rules, prompts, policies, thresholds, or production behavior. It may only create learning evidence and proposed candidates.

## 7. Learning evidence mapper

Map outcome identity, action/decision references, expected-vs-actual records, variance, status, attribution, observations, execution evidence, risk outcomes, alerts, confidence, limitations, and provenance.

Rules:

- Preserve immutable source references.
- Use deterministic ordering.
- Reject duplicate outcome-definition IDs.
- Preserve units, currency, and periods.
- Do not convert missing actual values to zero.
- Preserve inconclusive and adverse outcomes.
- Do not infer causality when attribution is unsupported.
- Do not generate or deploy an update automatically.
- Preserve limitations and confounders.
- Avoid copying large evidence payloads unnecessarily.

## 8. Learning intake service

Implement:

```ts
interface LearningIntakeService {
  processOutcomeRecorded(
    event: PlatformEvent<OutcomeRecordedPayload>,
    handoff: LayerHandoff<OutcomeMonitoringToContinuousLearningPayload>,
    context: TenantContext
  ): Promise<LearningIntakeResult>;
}
```

Transactional flow:

```text
validate event
→ validate handoff
→ begin tenant event transaction
→ begin inbox processing
→ detect duplicate
→ load finalized outcome package
→ verify status, ownership, version, provenance, confidence, and policy
→ map learning evidence
→ create immutable learning-intake package
→ create learning evidence records
→ create one or more learning candidates in proposed state
→ persist comparison, variance, attribution, risk, and limitation references
→ persist handoff receipt
→ acknowledge handoff
→ enqueue cl.learning.requested
→ mark inbox processed
→ commit
```

On permanent failure, roll back domain writes, persist rejection through the eventing path, and return a controlled error.

## 9. Learning candidate types

Support:

```text
assumption_update
threshold_update
forecast_calibration
risk_model_update
decision_rule_update
simulation_distribution_update
digital_twin_calibration
operational_policy_update
data_quality_rule_update
no_change_recommended
insufficient_evidence
```

All candidates begin as `proposed`, `requires_more_evidence`, or `no_change_recommended`.

Do not create `approved`, `deployed`, or `active` candidates in this phase.

## 10. Safety boundary

The intake service may classify candidate types using deterministic rules. It must not train a model, modify production weights, alter prompts, change thresholds, update Simulation distributions, recalibrate Digital Twins, update ADI rules, alter ABA policies, or deploy anything.

## 11. Idempotency

Protect using incoming event ID, consumer name, outcome package ID/version, outcome record ID, monitoring plan ID, and learning-intake package ID.

Duplicate delivery must not duplicate intake, evidence, candidates, or `cl.learning.requested`. New package versions may create new intake versions. Revoked packages cannot process.

## 12. Outbound event

Emit:

```text
cl.learning.requested
```

Minimum payload:

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

Preserve tenant/workspace/business, correlation, and causation. Use aggregate type `learning_request` and the learning request ID as aggregate ID.

Do not emit `cl.learning.published`.

## 13. Handoff lifecycle

On success publish and persist `platform.handoff.acknowledged`, referencing the learning request, intake package, and candidate IDs.

On permanent failure publish and persist `platform.handoff.rejected`.

Acknowledgement and rejection must be mutually exclusive per package version.

## 14. Errors

Create:

```text
OutcomePackageNotFoundError
OutcomeNotFinalizedError
OutcomePackageRevokedError
OutcomeConfidenceError
OutcomeComparisonMissingError
OutcomeObservationEvidenceError
OutcomeAttributionError
OutcomeProvenanceError
LearningEvidenceMappingError
LearningCandidateClassificationError
LearningIntakeScopeMismatchError
DuplicateLearningIntakeError
```

Do not expose confidential observations or evidence.

## 15. Observability

Logs:

```text
om_to_cl_received
om_to_cl_validated
om_to_cl_duplicate_ignored
om_to_cl_intake_created
om_to_cl_evidence_registered
om_to_cl_candidate_created
om_to_cl_acknowledged
om_to_cl_rejected
om_to_cl_failed
```

Metrics:

```text
om_to_cl_received_total
om_to_cl_processed_total
om_to_cl_rejected_total
om_to_cl_duplicate_total
om_to_cl_failure_total
om_to_cl_candidate_total
om_to_cl_inconclusive_total
om_to_cl_adverse_total
om_to_cl_processing_seconds
```

Include event, handoff, outcome, monitoring plan, action, decision, learning request/intake, scope, correlation, causation, status, candidate count, confidence, duration, and failure code.

## 16. Security

- No unscoped OM or CL queries.
- All writes inside tenant transactions.
- Event, handoff, outcome, monitoring, action, decision, and learning scope must match.
- Block same-tenant cross-workspace access.
- Do not log raw observations or sensitive evidence.
- No credentials, secrets, tokens, or files in events.
- Apply data classification.
- Application role cannot bypass RLS.
- No automatic updates, deployment, or upstream feedback publication.

## 17. Tests

Unit tests must cover valid outcomes, unsupported versions, finalized status, confidence, missing comparison/evidence, attribution validity, inconclusive/adverse outcomes, deterministic mapping, duplicate definitions, candidate classification, no-change/insufficient-evidence candidates, outbound event, acknowledgement, and rejection.

Live PostgreSQL tests must cover:

- CL intake creation;
- evidence persistence;
- comparison, variance, attribution, and risk references;
- candidates created only in allowed initial states;
- inconclusive and no-change handling;
- event/package idempotency;
- newer package versions;
- revoked/non-finalized/low-confidence/missing-provenance rejection;
- tenant/workspace isolation;
- fail-closed context;
- rollback atomicity;
- `cl.learning.requested`;
- correlation and causation;
- acknowledgement and permanent rejection;
- relay dispatch;
- absence of approved, active, deployed, or published learning records.

End-to-end:

```text
insert finalized OM outcome package
→ enqueue om.outcome.recorded
→ relay runOnce()
→ OM → CL consumer
→ learning intake, evidence, and candidates persisted
→ handoff acknowledged
→ cl.learning.requested written to outbox
```

Target at least 60 meaningful tests.

## 18. Documentation

Create or update:

```text
docs/vertical-slices/om-to-cl.md
docs/om-to-cl-evidence-mapping.md
docs/learning-intake-policy.md
docs/learning-candidate-classification.md
docs/learning-intake-idempotency.md
docs/learning-intake-security.md
docs/continuous-learning-safety-boundary.md
apps/api/README.md
```

## 19. Validation

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

Run API/eventing integration tests against PostgreSQL 16. Do not use production credentials.

Do not claim completion unless the OM → CL end-to-end test passes.

## 20. Prohibited work

Do not implement model training, prompt/threshold/policy modification, Digital Twin calibration, Simulation distribution updates, ADI rule updates, ABA policy updates, automatic validation/approval/deployment, `cl.learning.published`, upstream feedback consumers, replay, external adapters, frontend, or broad CL conversion.

## 21. Stop condition

Stop after the OM → CL consumer, validation, CL intake/evidence/candidates, idempotency, acknowledgement/rejection, `cl.learning.requested`, RLS/rollback tests, relay end-to-end test, documentation, and completion report are complete.

Do not begin Phase 12.

## 22. Completion report

Return:

```text
EVENT BACKBONE PHASE 11 REPORT

Created:
- OM → CL consumer
- handoff validator
- learning evidence mapper
- learning intake service
- intake policy
- candidate classifier
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
- OM outcome package inserted
- om.outcome.recorded enqueued
- relay dispatch
- CL learning intake created
- evidence records registered
- candidates created
- candidate states verified
- handoff acknowledged
- cl.learning.requested emitted
- correlation preserved
- causation preserved
- duplicate delivery idempotent
- rollback atomicity
- tenant isolation
- workspace isolation
- no automatic update
- no production deployment
- no cl.learning.published event

Security:
- scoped OM and CL access
- sensitive-evidence handling
- automatic-update prohibition
- payload redaction
- RLS status

Not started:
- candidate validation
- approval
- publication
- upstream feedback
- replay
- external adapters
- frontend

Risks or unresolved issues:
- exact issue
- impact
- recommended resolution

Next recommended task:
- Event Backbone Phase 12 — CL validation, approval, and controlled feedback publication
```
