# INFINICUS EVENT BACKBONE — PHASE 8 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey:

1. `CLAUDE.md`
2. `INFINICUS-PLATFORM-EVENT-CATALOGUE.md`
3. `INFINICUS-LAYER-HANDOFF-CONTRACTS.md`
4. `INFINICUS-EVENT-BACKBONE-IMPLEMENTATION-PLAN.md`
5. Event Backbone Phases 1–7 implementations and reports
6. Database Stage 2F Simulation implementation
7. Database Stage 2G AI Decision Intelligence implementation
8. `INFINICUS-SIMULATION-EXTRACTION-SPECIFICATION.md`
9. Existing event, handoff, inbox, outbox, relay, and consumer patterns
10. Existing tenant-scoped PostgreSQL integration-test harness

## Objective

Implement Event Backbone Phase 8 only:

```text
SIM → ADI production decision-intake consumer
```

Implement:

```text
sim.simulation.completed
→ validate Simulation result package
→ validate sim-to-adi.simulation-result-package
→ persist ADI decision-intake package
→ register evidence, scenarios, risks, confidence, and limitations
→ record inbox processing
→ acknowledge or reject handoff
→ emit adi.decision.requested
```

Use an existing canonical ADI intake event when already defined.

Do not implement recommendation generation, LLM calls, decision ranking, approval, ADI → ABA, external adapters, replay, frontend, or broad ADI conversion.

Stop after the SIM → ADI intake slice is live-tested.

## 1. Preconditions

Confirm:

- Phases 1–7 pass.
- `sim.simulation.completed` exists.
- `sim-to-adi.simulation-result-package` exists.
- Stage 2F Simulation result persistence exists.
- Stage 2G ADI intake persistence exists.
- Inbox, outbox, relay, and in-process adapter pass.
- Stage 2F and 2G migrations are frozen.
- Simulation and ADI RLS policies pass.

If Stage 2G is absent, stop and report the prerequisite. Do not create ADI tables ad hoc.

## 2. Target structure

```text
apps/api/src/eventing/consumers/sim-to-adi/
├── SimulationCompletedConsumer.ts
├── SimToAdiHandoffValidator.ts
├── DecisionEvidenceMapper.ts
├── DecisionIntakeService.ts
├── DecisionIntakePolicy.ts
├── SimToAdiConsumerDefinition.ts
├── errors.ts
└── index.ts
```

Tests:

```text
apps/api/tests/eventing/sim-to-adi/
├── simulation-completed.unit.test.ts
├── sim-to-adi-handoff.unit.test.ts
├── decision-evidence-mapper.unit.test.ts
├── decision-intake.integration.test.ts
├── decision-intake-idempotency.integration.test.ts
├── decision-intake-rls.integration.test.ts
└── decision-intake-failure.integration.test.ts
```

## 3. Input event

Consume:

```text
sim.simulation.completed
```

Minimum payload:

```ts
{
  simulationId: string;
  simulationRequestId: string;
  simulationInputPackageId: string;
  businessId: string;
  resultPackageId: string;
  scenarioCount: number;
  horizonDays: number;
  confidenceScore: number;
  verdictSupport: "go" | "modify" | "stop";
  completedAt: string;
  limitations: unknown[];
}
```

Reject when version is unsupported, result package missing/revoked, simulation incomplete, scope mismatched, confidence too low, provenance incomplete, scenarios invalid, model/horizon unsupported, critical limitation unresolved, or package version already consumed.

## 4. Handoff contract

Use:

```text
sim-to-adi.simulation-result-package
```

Expected payload:

```ts
{
  resultPackageId: string;
  simulationId: string;
  simulationRequestId: string;
  businessId: string;
  engineVersion: string;
  modelVersion: string;
  horizonDays: number;
  randomSeed: string;
  scenarioSummaries: Array<{
    scenarioId: string;
    name: string;
    probability?: number;
    outcomeSummary: unknown;
    confidenceScore: number;
  }>;
  projectionReferences: string[];
  riskReferences: string[];
  sensitivityReferences: string[];
  stressTestReferences: string[];
  findingReferences: string[];
  confidenceScore: number;
  verdictSupport: "go" | "modify" | "stop";
  limitations: unknown[];
  provenanceReference: string;
}
```

Validate the complete handoff before ADI writes. Do not bypass it by scanning arbitrary Simulation tables.

## 5. Acceptance policy

Defaults:

```text
simulation confidence >= 0.75
at least one valid scenario
required provenance present
supported engine/model versions
supported horizon
no critical unresolved limitation
matching tenant/workspace/business scope
```

For Engine v3 compatibility, require `horizonDays = 90` unless another versioned model explicitly supports a different horizon.

Make thresholds and supported versions configurable.

Rejection codes:

```text
unsupported_version
schema_invalid
tenant_mismatch
workspace_mismatch
business_scope_invalid
simulation_not_completed
result_package_not_found
result_package_revoked
confidence_below_threshold
scenario_missing
scenario_invalid
provenance_incomplete
critical_limitation
unsupported_engine_version
unsupported_model_version
unsupported_horizon
duplicate_result_package
```

## 6. Ownership boundary

Simulation owns scenario generation, projections, risks, sensitivity, stress tests, findings, and verdict support.

ADI owns decision requests, evidence packages, candidates, scoring, comparison, recommendations, confidence, explanations, limitations, and publication.

Simulation must not approve action. Verdict support remains evidence only.

## 7. Decision evidence mapper

Map immutable references for scenarios, projections, risks, sensitivity, stress tests, findings, confidence, verdict support, limitations, engine/model versions, horizon, seed, and provenance.

Rules:

- preserve immutable source references;
- avoid copying large payloads;
- use deterministic ordering;
- reject duplicate scenario IDs and invalid probabilities;
- preserve confidence;
- do not generate recommendations;
- do not convert Go/Modify/Stop into approval;
- preserve units, currency, and periods through metadata.

## 8. Decision intake service

Implement:

```ts
interface DecisionIntakeService {
  processSimulationCompleted(
    event: PlatformEvent<SimulationCompletedPayload>,
    handoff: LayerHandoff<SimulationToAiDecisionIntelligencePayload>,
    context: TenantContext
  ): Promise<DecisionIntakeResult>;
}
```

Transactional flow:

```text
validate event
→ validate handoff
→ begin tenant event transaction
→ begin inbox processing
→ detect duplicate
→ load result package
→ verify status, ownership, version, provenance, confidence
→ map evidence references
→ create ADI decision request
→ create immutable evidence package
→ persist scenario/risk/sensitivity/stress-test/finding references
→ persist handoff receipt
→ acknowledge handoff
→ enqueue adi.decision.requested
→ mark inbox processed
→ commit
```

On permanent failure, roll back domain writes, persist rejection through the eventing path, and return a controlled error.

## 9. Idempotency

Protect with incoming event ID, consumer name, result package ID/version, simulation ID, simulation request ID, and ADI decision request ID.

Duplicate delivery must not duplicate the request, evidence records, or outbound event. A newer result-package version may create a new intake version. Revoked packages cannot process.

## 10. Outbound event

Emit:

```text
adi.decision.requested
```

Minimum payload:

```ts
{
  decisionRequestId: string;
  decisionEvidencePackageId: string;
  simulationId: string;
  simulationResultPackageId: string;
  businessId: string;
  scenarioCount: number;
  horizonDays: number;
  confidenceScore: number;
  verdictSupport: "go" | "modify" | "stop";
  requestedAt: string;
}
```

Envelope requirements:

- same tenant/workspace/business;
- same correlation ID;
- causation ID equals incoming Simulation event ID;
- aggregate type `decision_request`;
- aggregate ID equals ADI request ID;
- registered version and validated payload.

Do not emit `adi.decision.generated`.

## 11. Handoff lifecycle

On success publish and persist `platform.handoff.acknowledged`, referencing the decision request and evidence package.

On permanent rejection publish and persist `platform.handoff.rejected`.

Acknowledgement and rejection must be mutually exclusive for the same package version.

## 12. Errors

Create:

```text
SimulationResultPackageNotFoundError
SimulationResultNotCompletedError
SimulationResultPackageRevokedError
SimulationResultConfidenceError
SimulationResultProvenanceError
SimulationScenarioValidationError
SimulationModelVersionError
SimulationHorizonError
DecisionEvidenceMappingError
DecisionIntakeScopeMismatchError
DuplicateDecisionIntakeError
```

Do not expose raw results or confidential evidence.

## 13. Observability

Logs:

```text
sim_to_adi_received
sim_to_adi_validated
sim_to_adi_duplicate_ignored
sim_to_adi_decision_request_created
sim_to_adi_evidence_package_created
sim_to_adi_reference_registered
sim_to_adi_acknowledged
sim_to_adi_rejected
sim_to_adi_failed
```

Metrics:

```text
sim_to_adi_received_total
sim_to_adi_processed_total
sim_to_adi_rejected_total
sim_to_adi_duplicate_total
sim_to_adi_failure_total
sim_to_adi_scenario_total
sim_to_adi_evidence_reference_total
sim_to_adi_processing_seconds
```

Include event, handoff, simulation, result, decision request, evidence package, scope, correlation, causation, counts, confidence, verdict support, duration, status, and failure code.

## 14. Security

- No unscoped Simulation or ADI queries.
- All writes inside tenant transactions.
- Event, handoff, result, simulation, and decision scope must match.
- Block same-tenant cross-workspace access.
- Do not log raw sensitive results.
- Do not include model prompts, credentials, or files in events.
- Apply data classification.
- Application role cannot bypass RLS.
- Verdict support is not authorization.

## 15. Tests

Unit tests must cover valid input, unsupported versions, confidence threshold, missing/duplicate/invalid scenarios, unsupported engine/model/horizon, deterministic mapping, verdict-support boundary, outbound event, acknowledgement, and rejection.

Live PostgreSQL tests must cover:

- decision request creation;
- immutable evidence package;
- all reference categories;
- duplicate-event and package idempotency;
- newer package version;
- revoked/low-confidence/missing-provenance/unsupported-model/horizon rejection;
- tenant/workspace isolation;
- fail-closed context;
- rollback atomicity;
- `adi.decision.requested`;
- correlation and causation;
- acknowledgement and permanent rejection;
- relay dispatch.

End-to-end:

```text
insert completed Simulation result package
→ enqueue sim.simulation.completed
→ relay runOnce()
→ SIM → ADI consumer
→ ADI decision request and evidence package persisted
→ handoff acknowledged
→ adi.decision.requested written to outbox
```

Target at least 55 meaningful tests.

## 16. Documentation

Create or update:

```text
docs/vertical-slices/sim-to-adi.md
docs/sim-to-adi-evidence-mapping.md
docs/decision-intake-quality-policy.md
docs/decision-intake-idempotency.md
docs/decision-intake-security.md
apps/api/README.md
```

## 17. Validation

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

Do not claim completion unless the SIM → ADI end-to-end test passes.

## 18. Prohibited work

Do not implement recommendation generation, LLM calls, candidate generation, scoring, ranking, explanations, `adi.decision.generated`, ADI → ABA, approval, external adapters, replay, frontend, or broad ADI conversion.

## 19. Stop condition

Stop after the consumer, validation, ADI request/evidence persistence, reference registration, idempotency, acknowledgement/rejection, outbound intake event, RLS/rollback tests, relay end-to-end test, documentation, and completion report are complete.

Do not begin Phase 9.

## 20. Completion report

Return:

```text
EVENT BACKBONE PHASE 8 REPORT

Created:
- SIM → ADI consumer
- handoff validator
- decision evidence mapper
- decision intake service
- intake policy
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
- Simulation result package inserted
- sim.simulation.completed enqueued
- relay dispatch
- ADI decision request created
- evidence package created
- scenario/risk/sensitivity/stress-test/finding references registered
- handoff acknowledged
- adi.decision.requested emitted
- correlation preserved
- causation preserved
- duplicate delivery idempotent
- rollback atomicity
- tenant isolation
- workspace isolation

Security:
- scoped access
- sensitive-evidence handling
- verdict-support boundary
- payload redaction
- RLS status

Not started:
- ADI decision generation
- LLM calls
- ADI → ABA
- replay
- external adapters
- frontend

Risks or unresolved issues:
- exact issue
- impact
- recommended resolution

Next recommended task:
- Event Backbone Phase 9 — ADI → ABA approval intake
```
