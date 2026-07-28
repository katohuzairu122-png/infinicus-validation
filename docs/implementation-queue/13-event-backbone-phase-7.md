# INFINICUS EVENT BACKBONE — PHASE 7 EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey:

1. `CLAUDE.md`
2. `INFINICUS-PLATFORM-EVENT-CATALOGUE.md`
3. `INFINICUS-LAYER-HANDOFF-CONTRACTS.md`
4. `INFINICUS-EVENT-BACKBONE-IMPLEMENTATION-PLAN.md`
5. Event Backbone Phases 1–6 implementations and reports
6. Database Stage 2D Business Intelligence implementation
7. Database Stage 2E Business Digital Twin implementation
8. Database Stage 2F Simulation implementation
9. `INFINICUS-SIMULATION-EXTRACTION-SPECIFICATION.md`
10. Existing event, handoff, inbox, outbox, relay, and consumer patterns
11. Existing tenant-scoped PostgreSQL integration-test harness

## Objective

Implement Event Backbone Phase 7 only:

```text
BI → SIM
DT → SIM
```

Create the Simulation intake boundary that combines validated Business Intelligence outputs and a versioned Digital Twin snapshot into one reproducible simulation request.

Required paths:

```text
bi.analysis.completed
→ validate BI simulation-input package
→ register BI input contribution

dt.state.updated or dt.snapshot.published
→ validate Digital Twin simulation-context package
→ register DT input contribution

BI contribution + DT contribution + simulation request
→ create simulation input package
→ persist assumptions and provenance
→ emit sim.simulation.requested
```

Use existing canonical event names when already defined.

Do not implement:

- Monte Carlo execution;
- scenario execution;
- Simulation result generation;
- SIM → ADI;
- BI → ADI;
- DT → ADI;
- external adapters;
- replay execution;
- frontend;
- broad Simulation extraction.

Stop after the combined Simulation intake flow is live-tested.

---

# 1. PRECONDITIONS

Confirm:

- Event Backbone Phases 1–6 pass;
- Stage 2F Simulation persistence exists;
- `bi.analysis.completed` exists;
- `dt.state.updated` or `dt.snapshot.published` exists;
- a canonical Simulation request event exists or is added through the Phase 1 registry pattern;
- BI result packages exist;
- Digital Twin snapshots or versioned state exist;
- simulation request, input-package, assumption, and provenance tables exist;
- relay and in-process adapter pass;
- Stage 2D, 2E, and 2F migration ranges are frozen;
- RLS passes for BI, DT, and SIM.

If Stage 2F is absent, stop and report the prerequisite.

Do not create Simulation tables ad hoc.

---

# 2. TARGET STRUCTURE

Create or complete:

```text
apps/api/src/eventing/consumers/simulation-intake/
├── BiToSimulationConsumer.ts
├── DtToSimulationConsumer.ts
├── SimulationInputCoordinator.ts
├── BiSimulationInputValidator.ts
├── DtSimulationContextValidator.ts
├── SimulationInputMapper.ts
├── SimulationRequestService.ts
├── SimulationIntakePolicy.ts
├── errors.ts
└── index.ts
```

Tests:

```text
apps/api/tests/eventing/simulation-intake/
├── bi-to-sim.unit.test.ts
├── dt-to-sim.unit.test.ts
├── simulation-input-coordinator.unit.test.ts
├── simulation-input-mapper.unit.test.ts
├── simulation-intake.integration.test.ts
├── simulation-intake-idempotency.integration.test.ts
├── simulation-intake-rls.integration.test.ts
└── simulation-intake-failure.integration.test.ts
```

---

# 3. BI INPUT PATH

Consume:

```text
bi.analysis.completed
```

Expected BI contribution:

```ts
{
  resultPackageId: string;
  analysisId: string;
  businessId: string;
  forecastReferences?: string[];
  trendReferences?: string[];
  anomalyReferences?: string[];
  metricReferences: string[];
  qualityScore: number;
  confidenceScore: number;
  effectiveAt: string;
  limitations: unknown[];
}
```

Reject when:

- unsupported version;
- result package missing or revoked;
- analysis incomplete;
- tenant/workspace/business mismatch;
- quality or confidence below policy;
- provenance incomplete;
- required metric references missing;
- critical limitation unresolved;
- stale beyond policy.

---

# 4. DIGITAL TWIN INPUT PATH

Consume the canonical Digital Twin simulation-input event.

Preferred:

```text
dt.snapshot.published
```

Fallback only when no snapshot publication event exists:

```text
dt.state.updated
```

Expected DT contribution:

```ts
{
  digitalTwinId: string;
  snapshotId?: string;
  stateVersion: number;
  businessId: string;
  entityReferences: string[];
  relationshipReferences: string[];
  assumptionReferences: string[];
  constraintReferences: string[];
  effectiveAt: string;
  confidenceScore: number;
  limitations: unknown[];
}
```

Reject when:

- snapshot/state missing or revoked;
- tenant/workspace/business mismatch;
- state version unsupported;
- confidence below policy;
- critical constraint unresolved;
- required entities missing;
- provenance incomplete;
- stale beyond policy.

Prefer immutable published snapshots over mutable current state.

---

# 5. HANDOFF CONTRACTS

Use:

```text
bi-to-sim.intelligence-input-package
dt-to-sim.digital-twin-context-package
```

The BI handoff must carry:

```text
forecast references
trend references
anomaly references
metric references
confidence
quality
effective time
limitations
```

The DT handoff must carry:

```text
snapshot/state reference
entities
relationships
assumptions
constraints
confidence
effective time
limitations
```

Validate both envelopes and payloads before creating a Simulation input package.

---

# 6. COORDINATION MODEL

Implement a coordinator that waits for compatible BI and DT contributions.

Compatibility key:

```text
tenant ID
workspace ID
business ID
simulation request ID or correlation group
effective-period compatibility
supported contract versions
```

Coordinator states:

```text
waiting_for_bi
waiting_for_dt
ready
invalid
expired
consumed
```

Rules:

- BI and DT inputs may arrive in either order;
- duplicate contribution is idempotent;
- incompatible contributions must not be combined;
- stale unmatched contributions expire according to policy;
- consumed contribution set cannot be reused for a second request unless explicitly versioned;
- ready state must be deterministic.

---

# 7. SIMULATION REQUEST

Support an explicit Simulation request:

```ts
{
  simulationRequestId: string;
  businessId: string;
  horizonDays: number;
  scenarioSetId?: string;
  assumptionSetId?: string;
  requestedBy: string;
  requestedAt: string;
}
```

Default horizon for Engine v3 compatibility:

```text
90 days
```

Validation:

- horizon positive;
- v3 compatibility path requires 90 days unless a versioned model explicitly supports another horizon;
- requester authorized;
- business scope valid;
- assumption set valid;
- scenario set valid;
- request not cancelled;
- no duplicate active request.

---

# 8. ACCEPTANCE POLICY

Default thresholds:

```text
BI quality >= 0.80
BI confidence >= 0.75
DT confidence >= 0.75
maximum BI/DT effective-time gap <= 24 hours
no critical unresolved limitation
valid provenance
matching tenant/workspace/business scope
```

Make thresholds configurable.

Rejection codes:

```text
unsupported_version
schema_invalid
tenant_mismatch
workspace_mismatch
business_scope_invalid
bi_quality_below_threshold
bi_confidence_below_threshold
dt_confidence_below_threshold
provenance_incomplete
critical_limitation
input_stale
effective_time_mismatch
missing_bi_input
missing_dt_input
invalid_horizon
invalid_assumption_set
invalid_scenario_set
duplicate_request
request_cancelled
input_incompatible
```

---

# 9. SIMULATION INPUT MAPPER

Implement deterministic mapping into a Simulation input package.

Persist:

```text
simulation request
BI contribution reference
DT contribution reference
Digital Twin snapshot/state version
BI result package version
assumption-set reference
scenario-set reference
horizon
random seed placeholder or supplied seed
model version
engine version
limitations
quality summary
provenance
```

Rules:

- do not copy full BI or DT payloads unnecessarily;
- retain immutable references;
- preserve units, currencies, and timestamps through metadata;
- no simulation calculation in the mapper;
- no verdict logic;
- no action recommendation;
- deterministic ordering of references.

---

# 10. SIMULATION REQUEST SERVICE

Implement:

```ts
interface SimulationRequestService {
  registerBiContribution(...): Promise<SimulationInputCoordinationResult>;
  registerDtContribution(...): Promise<SimulationInputCoordinationResult>;
  createSimulationRequest(...): Promise<SimulationRequestResult>;
  assembleReadyInput(...): Promise<SimulationInputPackageResult>;
}
```

Required flow:

```text
validate incoming event
→ validate handoff
→ begin tenant event transaction
→ begin inbox processing
→ detect duplicate
→ persist contribution
→ update coordinator state
→ when request + BI + DT are compatible:
   create immutable simulation input package
   persist provenance and quality summary
   acknowledge both handoffs
   enqueue sim.simulation.requested
→ mark inbox processed
→ commit
```

A failure must roll back all writes and outbound events.

---

# 11. IDEMPOTENCY

Protect using:

```text
incoming event ID
consumer name
BI result package ID and version
DT snapshot/state ID and version
simulation request ID
input package version
business ID
```

Requirements:

- duplicate BI event does not duplicate contribution;
- duplicate DT event does not duplicate contribution;
- duplicate request does not duplicate input package;
- repeated relay delivery does not duplicate `sim.simulation.requested`;
- newer BI or DT versions may form a new input package version;
- revoked source cannot be assembled;
- consumed contribution set cannot be reused accidentally.

---

# 12. OUTBOUND EVENT

Emit the canonical Simulation request event.

Preferred:

```text
sim.simulation.requested
```

Minimum payload:

```ts
{
  simulationRequestId: string;
  simulationInputPackageId: string;
  businessId: string;
  horizonDays: number;
  biResultPackageId: string;
  digitalTwinId: string;
  digitalTwinSnapshotId?: string;
  stateVersion: number;
  assumptionSetId: string;
  scenarioSetId?: string;
  engineVersion: string;
  modelVersion: string;
  requestedAt: string;
}
```

Envelope requirements:

- same tenant/workspace/business;
- correlation ID preserved from the Simulation request or coordination group;
- causation references the event that completed readiness;
- aggregate type `simulation_request`;
- aggregate ID equals request ID;
- registered version;
- payload validates.

Do not emit `sim.simulation.started` or `sim.simulation.completed`.

---

# 13. HANDOFF ACKNOWLEDGEMENT AND REJECTION

Acknowledge BI and DT handoffs only after the immutable Simulation input package is created.

Publish:

```text
platform.handoff.acknowledged
```

Permanent invalid inputs publish:

```text
platform.handoff.rejected
```

Pending compatible input is not a rejection.

For waiting states, persist coordination status without acknowledging completion prematurely.

---

# 14. ERROR TYPES

Create controlled errors:

```text
BusinessIntelligenceSimulationInputError
DigitalTwinSimulationContextError
SimulationInputCompatibilityError
SimulationInputStaleError
SimulationInputQualityError
SimulationRequestNotFoundError
SimulationRequestCancelledError
SimulationRequestDuplicateError
SimulationHorizonError
SimulationAssumptionSetError
SimulationScenarioSetError
SimulationInputAssemblyError
```

Do not expose confidential BI or DT payloads.

---

# 15. OBSERVABILITY

Structured logs:

```text
simulation_bi_input_received
simulation_dt_input_received
simulation_input_waiting
simulation_input_ready
simulation_input_incompatible
simulation_input_expired
simulation_request_created
simulation_input_package_created
simulation_intake_acknowledged
simulation_intake_rejected
simulation_intake_failed
```

Required fields:

```text
eventId
handoffId
simulationRequestId
simulationInputPackageId
biResultPackageId
digitalTwinId
snapshotId
tenantId
workspaceId
businessId
correlationId
causationId
consumerName
coordinatorState
horizonDays
durationMs
status
failureCode
```

Metrics:

```text
simulation_bi_input_total
simulation_dt_input_total
simulation_input_ready_total
simulation_input_waiting_total
simulation_input_incompatible_total
simulation_input_expired_total
simulation_request_total
simulation_intake_failure_total
simulation_intake_processing_seconds
```

---

# 16. SECURITY

Requirements:

- no unscoped BI, DT, or SIM access;
- all writes inside tenant transactions;
- event, handoff, source package, twin, and request scope must match;
- same-tenant cross-workspace blocked;
- restricted analytical evidence not copied into logs;
- requester authorization validated;
- no model prompts, credentials, or raw files in event payloads;
- application role cannot bypass RLS.

---

# 17. TESTS

## Unit tests

- BI contribution validation;
- DT contribution validation;
- 90-day default horizon;
- invalid horizon rejection;
- contributions arriving BI first;
- contributions arriving DT first;
- effective-time compatibility;
- stale input rejection;
- coordinator transitions;
- deterministic mapping;
- invalid assumption set;
- invalid scenario set;
- outbound event validation;
- acknowledgement timing;
- rejection behavior.

## Live PostgreSQL integration tests

- BI contribution persists;
- DT contribution persists;
- request persists;
- BI first then DT creates input package;
- DT first then BI creates input package;
- incompatible timestamps remain invalid;
- stale contribution expires;
- duplicate BI event idempotent;
- duplicate DT event idempotent;
- duplicate request idempotent;
- newer source version creates new input package version;
- revoked source rejected;
- low-quality BI rejected;
- low-confidence DT rejected;
- tenant A cannot combine tenant B input;
- same-tenant cross-workspace blocked;
- missing context fails closed;
- rollback removes package and event;
- `sim.simulation.requested` emitted;
- correlation preserved;
- causation correct;
- handoffs acknowledged only when ready;
- relay reaches both consumers.

## End-to-end test

Execute:

```text
insert valid BI result package
→ insert valid DT snapshot
→ create Simulation request
→ enqueue BI and DT source events
→ relay runOnce() until both processed
→ coordinator becomes ready
→ immutable Simulation input package created
→ both handoffs acknowledged
→ sim.simulation.requested written to outbox
```

Target:

```text
at least 65 meaningful tests
```

---

# 18. DOCUMENTATION

Create or update:

```text
docs/vertical-slices/bi-dt-to-sim.md
docs/simulation-input-coordination.md
docs/simulation-input-compatibility.md
docs/simulation-intake-quality-policy.md
docs/simulation-intake-idempotency.md
docs/simulation-intake-security.md
apps/api/README.md
```

Document:

- both input paths;
- handoff contracts;
- coordination states;
- compatibility rules;
- 90-day compatibility rule;
- persistence mapping;
- idempotency;
- acknowledgement timing;
- outbound Simulation event;
- observability;
- test setup;
- what remains for Simulation execution.

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

Do not claim completion unless the combined BI + DT → SIM end-to-end test passes.

---

# 20. PROHIBITED WORK

Do not implement:

- Monte Carlo execution;
- scenario generation;
- Simulation result interpretation;
- Go / Modify / Stop verdict support;
- SIM → ADI;
- BI → ADI;
- DT → ADI;
- external adapters;
- replay execution;
- frontend;
- broad Simulation extraction.

---

# 21. STOP CONDITION

Stop after:

1. BI → SIM consumer exists;
2. DT → SIM consumer exists;
3. coordination state works;
4. explicit Simulation request works;
5. compatibility checks work;
6. immutable Simulation input package is created;
7. idempotency works;
8. acknowledgements and rejections work;
9. `sim.simulation.requested` works;
10. RLS and rollback tests pass;
11. relay end-to-end test passes;
12. documentation is complete;
13. completion report is produced.

Do not begin Event Backbone Phase 8.

---

# 22. COMPLETION REPORT FORMAT

Return:

```text
EVENT BACKBONE PHASE 7 REPORT

Created:
- BI → SIM consumer
- DT → SIM consumer
- Simulation input coordinator
- validators
- mapper
- Simulation request service
- intake policy
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
- BI package inserted
- DT snapshot inserted
- Simulation request created
- BI event relayed
- DT event relayed
- coordinator reached ready
- input package created
- handoffs acknowledged
- sim.simulation.requested emitted
- correlation preserved
- causation preserved
- duplicate delivery idempotent
- rollback atomicity
- tenant isolation
- workspace isolation

Totals:
- consumers
- coordinator states
- input packages
- integration tests
- tests passing

Security:
- scoped BI, DT, and SIM access
- requester authorization
- confidential-evidence handling
- payload redaction
- RLS status

Not started:
- Simulation execution
- Monte Carlo engine
- SIM → ADI consumer
- remaining vertical-slice consumers
- replay execution
- external adapters
- frontend

Risks or unresolved issues:
- exact issue
- impact
- recommended resolution

Next recommended task:
- Event Backbone Phase 8 — SIM → ADI decision intake
```
