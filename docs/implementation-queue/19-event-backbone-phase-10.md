# INFINICUS EVENT BACKBONE — PHASE 10 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey:

1. `CLAUDE.md`
2. `INFINICUS-PLATFORM-EVENT-CATALOGUE.md`
3. `INFINICUS-LAYER-HANDOFF-CONTRACTS.md`
4. `INFINICUS-EVENT-BACKBONE-IMPLEMENTATION-PLAN.md`
5. Event Backbone Phases 1–9 implementations and reports
6. Database Stage 2H Approved Business Action implementation
7. Database Stage 2I Outcome Monitoring implementation
8. Existing event, handoff, inbox, outbox, relay, approval, execution, and consumer patterns
9. Existing tenant-scoped PostgreSQL integration-test harness

## Objective

Implement Event Backbone Phase 10 only:

```text
ABA → OM production execution and outcome-intake boundary
```

Implement the cross-layer paths:

```text
aba.action.approved
→ validate approved-action package
→ create OM monitoring plan and baseline

aba.action.executed
→ validate execution-evidence package
→ register execution evidence
→ activate monitoring plan
→ emit om.monitoring.started
```

When an outcome observation is already produced by ABA execution infrastructure, also support:

```text
aba.execution.outcome_observed
→ validate observation package
→ persist initial OM observation
```

Use existing canonical event names when already defined.

Do not implement:

- approval decisions;
- action execution engines;
- payment processing;
- external system calls;
- final outcome scoring;
- OM → CL;
- Continuous Learning;
- replay execution;
- frontend;
- broad OM block conversion.

Stop after the ABA → OM monitoring intake boundary is live-tested.

---

# 1. PRECONDITIONS

Confirm:

- Event Backbone Phases 1–9 pass;
- `aba.action.approved` contract exists;
- `aba.action.executed` contract exists;
- a canonical OM monitoring-started event exists or is added through the Phase 1 registry pattern;
- `aba-to-om.execution-monitoring-package` exists;
- Stage 2H ABA approval, authorization, instruction, execution, and evidence persistence exists;
- Stage 2I OM monitoring-plan, baseline, observation, and evidence persistence exists;
- inbox, outbox, relay, and in-process adapter pass;
- Stage 2H and Stage 2I migrations are frozen;
- ABA and OM RLS policies pass.

If Stage 2I has not been implemented, stop and report the missing prerequisite.

Do not create OM tables ad hoc.

---

# 2. TARGET STRUCTURE

Create or complete:

```text
apps/api/src/eventing/consumers/aba-to-om/
├── ActionApprovedConsumer.ts
├── ActionExecutedConsumer.ts
├── AbaToOmHandoffValidator.ts
├── MonitoringPlanMapper.ts
├── ExecutionEvidenceMapper.ts
├── OutcomeMonitoringIntakeService.ts
├── MonitoringIntakePolicy.ts
├── AbaToOmConsumerDefinitions.ts
├── errors.ts
└── index.ts
```

Tests:

```text
apps/api/tests/eventing/aba-to-om/
├── action-approved.unit.test.ts
├── action-executed.unit.test.ts
├── aba-to-om-handoff.unit.test.ts
├── monitoring-plan-mapper.unit.test.ts
├── execution-evidence-mapper.unit.test.ts
├── aba-to-om.integration.test.ts
├── aba-to-om-idempotency.integration.test.ts
├── aba-to-om-rls.integration.test.ts
└── aba-to-om-failure.integration.test.ts
```

Follow established package conventions where they differ.

---

# 3. APPROVED-ACTION INPUT

Consume:

```text
aba.action.approved
```

Expected minimum payload:

```ts
{
  approvalRequestId: string;
  approvalCandidateId: string;
  approvedActionId: string;
  decisionId: string;
  businessId: string;
  actionType: string;
  authorizationId: string;
  approvedAt: string;
  approvedBy: string;
  expectedOutcomeReferences: string[];
  limitations: unknown[];
}
```

Reject when:

- event version unsupported;
- approval record missing;
- approval status is not approved;
- authorization missing, expired, revoked, or invalid;
- tenant/workspace/business mismatch;
- action type unsupported for monitoring;
- expected-outcome definition missing;
- monitoring baseline cannot be resolved;
- provenance incomplete;
- package version already consumed.

---

# 4. EXECUTION INPUT

Consume:

```text
aba.action.executed
```

Expected minimum payload:

```ts
{
  approvedActionId: string;
  executionId: string;
  businessId: string;
  actionType: string;
  executionStatus: "started" | "succeeded" | "failed" | "partially_succeeded";
  executedAt: string;
  executionEvidencePackageId: string;
  limitations: unknown[];
}
```

Reject when:

- event version unsupported;
- approved action missing;
- execution record missing;
- execution evidence package missing;
- execution does not belong to the approved action;
- authorization scope mismatched;
- tenant/workspace/business mismatch;
- monitoring plan missing where required;
- provenance incomplete;
- package revoked;
- duplicate execution package version already processed.

---

# 5. HANDOFF CONTRACT

Use:

```text
aba-to-om.execution-monitoring-package
```

Expected payload:

```ts
{
  approvedActionId: string;
  approvalRequestId: string;
  decisionId: string;
  businessId: string;
  actionType: string;
  authorizationReference: string;
  expectedOutcomes: Array<{
    outcomeDefinitionId: string;
    metricReference: string;
    baselineReference?: string;
    targetValue?: unknown;
    tolerance?: unknown;
    direction?: "increase" | "decrease" | "maintain" | "range";
    observationWindow: {
      startsAt: string;
      endsAt: string;
    };
  }>;
  execution?: {
    executionId: string;
    status: "started" | "succeeded" | "failed" | "partially_succeeded";
    executedAt: string;
    evidenceReferences: string[];
    externalReference?: string;
  };
  riskReferences: string[];
  limitationReferences?: string[];
  provenanceReference: string;
}
```

Validate the complete handoff before OM writes.

Do not bypass the package by scanning arbitrary ABA tables.

---

# 6. OWNERSHIP BOUNDARY

ABA owns:

```text
approval
authorization
action instruction
execution command
execution status
execution evidence
reversal and cancellation
```

OM owns:

```text
monitoring plans
baselines
observation windows
outcome observations
expected-versus-actual comparison
variance
attribution
outcome status
monitoring evidence
alerts
outcome publication
```

This phase must not execute or reverse actions.

This phase must not produce learning updates.

---

# 7. MONITORING PLAN MAPPER

Implement a deterministic mapper from approved action to OM monitoring plan.

Map:

```text
approved action
action type
decision and approval references
expected outcomes
metric references
baseline references
targets
tolerances
directions
observation windows
risk references
limitations
authorization reference
provenance
```

Rules:

- preserve immutable source references;
- deterministic ordering of outcomes and references;
- reject duplicate outcome-definition IDs;
- reject invalid observation windows;
- reject unsupported metric types;
- do not invent missing baselines;
- do not convert absent target values to zero;
- preserve units, currency, and time granularity;
- no outcome scoring in the mapper;
- no learning publication.

---

# 8. EXECUTION EVIDENCE MAPPER

Map:

```text
execution ID
execution status
execution timestamp
evidence references
external reference
action ID
authorization reference
limitations
provenance
```

Rules:

- preserve immutable evidence references;
- reject duplicate evidence references where uniqueness is required;
- do not store credentials or secrets;
- failed execution still activates failure monitoring where policy requires;
- partial execution must retain partial status;
- execution evidence does not prove outcome success;
- no outcome conclusion from execution status alone.

---

# 9. MONITORING INTAKE SERVICE

Implement:

```ts
interface OutcomeMonitoringIntakeService {
  processActionApproved(
    event: PlatformEvent<ActionApprovedPayload>,
    handoff: LayerHandoff<ApprovedBusinessActionToOutcomeMonitoringPayload>,
    context: TenantContext
  ): Promise<MonitoringPlanResult>;

  processActionExecuted(
    event: PlatformEvent<ActionExecutedPayload>,
    handoff: LayerHandoff<ApprovedBusinessActionToOutcomeMonitoringPayload>,
    context: TenantContext
  ): Promise<MonitoringActivationResult>;
}
```

Approved-action flow:

```text
validate event
→ validate handoff
→ begin tenant event transaction
→ begin inbox processing
→ detect duplicate
→ load approval and authorization
→ verify scope, status, version, and provenance
→ map monitoring plan
→ create immutable baseline references
→ create expected-outcome records
→ create monitoring windows
→ persist handoff receipt
→ acknowledge approved-action handoff
→ mark inbox processed
→ commit
```

Execution flow:

```text
validate event
→ validate handoff
→ begin tenant event transaction
→ begin inbox processing
→ detect duplicate
→ load approved action and monitoring plan
→ verify execution evidence and scope
→ register execution evidence
→ activate or update monitoring plan
→ establish actual observation start
→ persist handoff receipt
→ acknowledge execution handoff
→ enqueue om.monitoring.started
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

# 10. MONITORING PLAN STATES

Use controlled states:

```text
draft
awaiting_execution
active
paused
completed
cancelled
failed
```

Creation from `aba.action.approved`:

```text
awaiting_execution
```

Activation from `aba.action.executed`:

```text
active
```

For failed execution:

```text
active
```

when failure impact must be monitored, otherwise:

```text
failed
```

according to explicit policy.

Do not mark monitoring `completed` in this phase.

---

# 11. BASELINE RULES

Baselines must be:

- linked to an immutable reference or versioned snapshot;
- captured before or at the approved action boundary;
- tenant/workspace/business scoped;
- metric-specific;
- timestamped;
- unit-aware;
- quality-scored where supported;
- provenance-linked.

Reject when a required baseline is missing and no approved baseline-exemption policy applies.

Do not silently substitute a current post-execution value as the baseline.

---

# 12. IDEMPOTENCY

Protect using:

```text
incoming event ID
consumer name
approved action ID
approval request ID
execution ID
handoff package ID and version
monitoring plan ID
```

Requirements:

- duplicate approval event does not duplicate monitoring plan;
- duplicate execution event does not duplicate execution evidence;
- repeated relay delivery does not duplicate `om.monitoring.started`;
- newer handoff version may update allowed references without rewriting history;
- revoked package cannot process;
- acknowledged package returns idempotent no-op.

---

# 13. OUTBOUND EVENT

Emit:

```text
om.monitoring.started
```

Minimum payload:

```ts
{
  monitoringPlanId: string;
  approvedActionId: string;
  executionId: string;
  businessId: string;
  actionType: string;
  expectedOutcomeCount: number;
  observationWindowStart: string;
  observationWindowEnd: string;
  executionStatus: "started" | "succeeded" | "failed" | "partially_succeeded";
  startedAt: string;
}
```

Envelope requirements:

- same tenant/workspace/business;
- same correlation ID;
- causation ID equals incoming `aba.action.executed` event ID;
- aggregate type `monitoring_plan`;
- aggregate ID equals monitoring plan ID;
- registered version;
- payload validates.

Do not emit:

```text
om.outcome.recorded
```

until an actual outcome observation exists.

---

# 14. OPTIONAL INITIAL OBSERVATION

Only when a canonical ABA execution-observation event already exists, support:

```text
aba.execution.outcome_observed
```

Persist:

```text
observation ID
monitoring plan ID
metric reference
observed value
observed at
evidence references
quality
provenance
```

Do not calculate final outcome or attribution in this phase.

Do not invent this event if it is not already part of the architecture.

---

# 15. HANDOFF ACKNOWLEDGEMENT AND REJECTION

On success, persist and publish:

```text
platform.handoff.acknowledged
```

Target references may include:

```text
monitoringPlanId
baselineRecordIds
expectedOutcomeRecordIds
executionEvidenceRecordIds
```

On permanent failure, persist and publish:

```text
platform.handoff.rejected
```

Approval and execution handoffs are acknowledged independently.

Acknowledgement and rejection must be mutually exclusive per package version.

---

# 16. ERROR TYPES

Create controlled errors:

```text
ApprovedActionNotFoundError
ApprovalNotFinalizedError
AuthorizationInvalidError
AuthorizationExpiredError
AuthorizationRevokedError
ExecutionRecordNotFoundError
ExecutionEvidencePackageNotFoundError
ExecutionEvidencePackageRevokedError
MonitoringPlanNotFoundError
MonitoringBaselineMissingError
MonitoringWindowInvalidError
OutcomeDefinitionInvalidError
OutcomeMetricUnsupportedError
OutcomeMonitoringScopeMismatchError
DuplicateMonitoringIntakeError
```

Do not expose sensitive execution evidence, credentials, or customer data in errors.

---

# 17. OBSERVABILITY

Structured logs:

```text
aba_to_om_approval_received
aba_to_om_approval_validated
aba_to_om_monitoring_plan_created
aba_to_om_baseline_registered
aba_to_om_execution_received
aba_to_om_execution_validated
aba_to_om_execution_evidence_registered
aba_to_om_monitoring_activated
aba_to_om_duplicate_ignored
aba_to_om_acknowledged
aba_to_om_rejected
aba_to_om_failed
```

Required fields:

```text
eventId
handoffId
approvalRequestId
approvedActionId
executionId
monitoringPlanId
tenantId
workspaceId
businessId
correlationId
causationId
consumerName
actionType
executionStatus
expectedOutcomeCount
observationWindowStart
observationWindowEnd
durationMs
status
failureCode
```

Metrics:

```text
aba_to_om_approval_received_total
aba_to_om_execution_received_total
aba_to_om_monitoring_plan_total
aba_to_om_monitoring_started_total
aba_to_om_rejected_total
aba_to_om_duplicate_total
aba_to_om_failure_total
aba_to_om_baseline_missing_total
aba_to_om_processing_seconds
```

---

# 18. SECURITY

Requirements:

- no unscoped ABA or OM queries;
- all writes inside tenant transactions;
- event, handoff, approval, authorization, action, execution, and monitoring scope must match;
- same-tenant cross-workspace access blocked;
- no raw execution evidence in logs;
- no credentials, secrets, tokens, or payment instruments in events;
- authorization must be verified but not reissued;
- application role cannot bypass RLS;
- no action execution;
- no reversal;
- no learning publication.

---

# 19. TESTS

## Unit tests

- valid approved-action event;
- valid executed-action event;
- unsupported versions rejected;
- invalid authorization rejected;
- expired authorization rejected;
- revoked authorization rejected;
- missing baseline rejected;
- baseline exemption policy;
- invalid monitoring window rejected;
- duplicate outcome definitions rejected;
- unsupported metric rejected;
- deterministic monitoring mapping;
- deterministic evidence mapping;
- execution status preserved;
- failed execution policy;
- outbound monitoring event validates;
- acknowledgement validates;
- rejection validates.

## Live PostgreSQL integration tests

- approved action creates monitoring plan;
- plan starts as `awaiting_execution`;
- expected outcomes persisted;
- baseline references persisted;
- monitoring windows persisted;
- execution event activates plan;
- execution evidence persisted;
- plan becomes `active`;
- duplicate approval event idempotent;
- duplicate execution event idempotent;
- newer package version handled without history rewrite;
- revoked package rejected;
- missing approval rejected;
- invalid authorization rejected;
- missing execution evidence rejected;
- missing required baseline rejected;
- tenant A cannot process tenant B action;
- same-tenant cross-workspace blocked;
- missing context fails closed;
- rollback removes OM records and outbound event;
- `om.monitoring.started` emitted;
- causation ID equals ABA execution event ID;
- correlation ID preserved;
- approval handoff acknowledged;
- execution handoff acknowledged;
- permanent rejection persisted;
- relay dispatch reaches both ABA → OM consumers;
- no outcome-completed or learning record created.

## End-to-end test

Execute:

```text
insert approved ABA action and authorization
→ enqueue aba.action.approved
→ relay runOnce()
→ OM monitoring plan created as awaiting_execution
→ insert ABA execution and evidence package
→ enqueue aba.action.executed
→ relay runOnce()
→ execution evidence registered
→ monitoring plan activated
→ handoff acknowledged
→ om.monitoring.started written to outbox
```

Target:

```text
at least 65 meaningful tests
```

---

# 20. DOCUMENTATION

Create or update:

```text
docs/vertical-slices/aba-to-om.md
docs/aba-to-om-monitoring-plan-mapping.md
docs/outcome-monitoring-baselines.md
docs/execution-evidence-boundary.md
docs/aba-to-om-idempotency.md
docs/aba-to-om-security.md
apps/api/README.md
```

Document:

- approved-action input;
- execution input;
- handoff contract;
- ownership boundary;
- monitoring-plan states;
- baseline rules;
- expected-outcome mapping;
- execution evidence;
- transaction flow;
- idempotency;
- acknowledgement and rejection;
- outbound monitoring event;
- observability;
- test setup;
- what remains for outcome observation, comparison, attribution, and OM → CL.

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

Do not claim completion unless the two-stage ABA approval/execution → OM end-to-end test passes.

---

# 22. PROHIBITED WORK

Do not implement:

- approval decisions;
- action execution;
- external system calls;
- payment processing;
- reversal;
- final outcome scoring;
- attribution;
- `om.outcome.recorded` without an observation;
- OM → CL;
- Continuous Learning;
- replay execution;
- frontend;
- broad OM TypeScript conversion.

---

# 23. STOP CONDITION

Stop after:

1. approved-action consumer exists;
2. executed-action consumer exists;
3. event and handoff validation work;
4. monitoring plan and baselines persist;
5. expected outcomes and windows persist;
6. execution evidence persists;
7. monitoring activation works;
8. idempotency works;
9. acknowledgement and rejection work;
10. `om.monitoring.started` works;
11. no execution, final outcome, or learning behavior is introduced;
12. RLS and rollback tests pass;
13. two-stage relay end-to-end test passes;
14. documentation is complete;
15. completion report is produced.

Do not begin Event Backbone Phase 11.

---

# 24. COMPLETION REPORT FORMAT

Return:

```text
EVENT BACKBONE PHASE 10 REPORT

Created:
- ABA approved-action consumer
- ABA executed-action consumer
- handoff validator
- monitoring-plan mapper
- execution-evidence mapper
- OM intake service
- monitoring policy
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

End-to-end verification:
- approved action inserted
- aba.action.approved enqueued
- monitoring plan created
- awaiting-execution status verified
- baselines registered
- expected outcomes registered
- execution inserted
- aba.action.executed enqueued
- execution evidence registered
- monitoring activated
- om.monitoring.started emitted
- correlation preserved
- causation preserved
- duplicate delivery idempotent
- rollback atomicity
- tenant isolation
- workspace isolation
- no action execution added
- no final outcome created
- no learning record created

Totals:
- consumers
- monitoring plans
- expected outcomes
- baseline references
- execution evidence references
- integration tests
- tests passing

Security:
- scoped ABA and OM access
- authorization validation
- execution-evidence protection
- payload redaction
- RLS status

Not started:
- outcome comparison
- variance and attribution
- final outcome publication
- OM → CL
- replay execution
- external adapters
- frontend

Risks or unresolved issues:
- exact issue
- impact
- recommended resolution

Next recommended task:
- Event Backbone Phase 11 — OM → CL learning intake
```
