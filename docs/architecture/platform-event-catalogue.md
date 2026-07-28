# INFINICUS PLATFORM EVENT CATALOGUE

Version: 1.0.0  
Status: Architecture baseline  
Scope: Cross-layer event naming, ownership, payloads, versioning, idempotency, retry, and failure handling

---

# 1. Purpose

This catalogue defines the canonical event language for the INFINICUS platform.

It governs event publication and consumption across:

1. Data Acquisition
2. Business Operations
3. Business Intelligence
4. Business Digital Twin
5. Simulation
6. AI Decision Intelligence
7. Approved Business Action
8. Outcome Monitoring
9. Continuous Learning

The catalogue exists to prevent:

- duplicate event names;
- incompatible payloads;
- unclear ownership;
- broken correlation chains;
- uncontrolled retries;
- cross-layer coupling;
- silent event loss;
- non-idempotent processing.

---

# 2. Canonical Event Envelope

Every platform event must use this envelope:

```ts
export interface PlatformEvent<TPayload = unknown> {
  id: string;
  eventType: string;
  eventVersion: number;

  tenantId: string;
  workspaceId: string;
  businessId?: string;

  aggregateType: string;
  aggregateId: string;

  correlationId: string;
  causationId?: string;

  producerLayer: PlatformLayer;
  producerBlock?: string;

  occurredAt: string;
  publishedAt?: string;

  payload: TPayload;
  metadata: EventMetadata;
}
```

Required metadata:

```ts
export interface EventMetadata {
  sourceSystem: string;
  sourceRecordId?: string;
  traceId?: string;
  actorType?: "user" | "service_account" | "system" | "integration";
  actorId?: string;
  schemaName: string;
  schemaVersion: number;
  idempotencyKey?: string;
  retryCount?: number;
  sensitivity?: "public" | "internal" | "confidential" | "restricted";
}
```

---

# 3. Naming Standard

Use:

```text
<layer>.<domain>.<past-tense-action>
```

Examples:

```text
da.data.published
bo.order.created
bi.analysis.completed
dt.state.updated
sim.simulation.completed
adi.decision.generated
aba.action.approved
om.outcome.recorded
cl.learning.published
```

Rules:

- use lowercase;
- use dot separators;
- use past tense;
- do not encode implementation details;
- do not include environment names;
- do not reuse an event name for a different payload;
- increment event version when the payload contract changes incompatibly.

Layer prefixes:

```text
da   Data Acquisition
bo   Business Operations
bi   Business Intelligence
dt   Business Digital Twin
sim  Simulation
adi  AI Decision Intelligence
aba  Approved Business Action
om   Outcome Monitoring
cl   Continuous Learning
```

---

# 4. Event Versioning Rules

Use integer versions:

```text
1
2
3
```

Version changes:

- additive optional field: same version allowed;
- required field added: new version;
- field meaning changed: new version;
- field removed: new version;
- enum narrowed incompatibly: new version;
- aggregate identity changed: new version.

Consumers must declare supported versions.

Do not silently accept unknown major versions.

---

# 5. Idempotency Standard

Every externally triggered or replayable event must include an idempotency key.

Canonical pattern:

```text
<eventType>:<aggregateId>:<businessStateVersion>
```

Examples:

```text
bo.order.completed:order-123:7
sim.simulation.completed:simulation-456:1
aba.action.approved:action-789:3
```

Consumer deduplication key:

```text
(event_id, consumer_name)
```

A consumer must not process the same event twice successfully.

---

# 6. Retry Standard

Default retry policy:

```text
attempt 1: immediate
attempt 2: 30 seconds
attempt 3: 2 minutes
attempt 4: 10 minutes
attempt 5: 30 minutes
attempt 6: 2 hours
```

After the final attempt:

```text
dead_lettered
```

Do not retry:

- schema validation failure;
- unsupported event version;
- authorization failure;
- permanently missing aggregate;
- logically invalid state transition.

Retry:

- temporary database failure;
- timeout;
- external service unavailability;
- network failure;
- transient lock conflict.

---

# 7. Dead-Letter Requirements

Every dead-letter record must preserve:

```text
original_event_id
event_type
event_version
payload
headers
consumer_name
failure_code
failure_message
attempt_count
first_failed_at
last_failed_at
replay_status
correlation_id
causation_id
```

Replay must create a new delivery attempt, not overwrite failure history.

---

# 8. Event Ownership Matrix

| Layer | Owns publication for | Primary consumers |
|---|---|---|
| DA | source, collection, validation, quality, provenance, publication | BO, BI |
| BO | operations, customers, orders, payments, inventory, tasks, incidents | BI, DT |
| BI | metrics, analysis, forecasts, anomalies, insights | DT, SIM, ADI |
| DT | state, entities, relationships, assumptions, calibration | SIM, ADI |
| SIM | scenarios, runs, projections, risks, verdict support | ADI |
| ADI | recommendations, decisions, confidence, risk | ABA |
| ABA | approvals, rejections, execution authorizations | OM |
| OM | observations, outcomes, benefits, adverse effects | CL |
| CL | lessons, model updates, rule updates, calibration updates | BI, DT, SIM, ADI |

---

# 9. DATA ACQUISITION EVENTS

## DA source and connector events

### `da.source.registered`

Producer: DA-02  
Aggregate: `data_source`  
Consumers: DA runtime, audit, administration

Payload:

```ts
{
  dataSourceId: string;
  sourceCode: string;
  sourceType: string;
  status: string;
}
```

### `da.connector.registered`

Producer: DA-03  
Aggregate: `connector`  
Consumers: DA runtime, operations monitoring

Payload:

```ts
{
  connectorId: string;
  dataSourceId: string;
  connectorType: string;
  protocol: string;
  status: string;
}
```

### `da.connector.health_changed`

Producer: DA-03  
Aggregate: `connector`  
Consumers: DA scheduling, incident handling

Payload:

```ts
{
  connectorId: string;
  previousHealth: string;
  currentHealth: string;
  checkedAt: string;
}
```

---

## DA collection events

### `da.collection.scheduled`

Producer: DA-05  
Aggregate: `collection_run`  
Consumers: DA orchestration

### `da.collection.started`

Producer: DA-05/DA-08/DA-09/DA-11  
Aggregate: `collection_run`  
Consumers: DA monitoring

### `da.collection.completed`

Producer: DA collection runtime  
Aggregate: `collection_run`  
Consumers: DA validation, audit

Payload:

```ts
{
  collectionRunId: string;
  dataSourceId: string;
  collectionType: string;
  recordsReceived: number;
  bytesReceived?: number;
  completedAt: string;
}
```

### `da.collection.failed`

Producer: DA collection runtime  
Aggregate: `collection_run`  
Consumers: incident handling, retry orchestration

### `da.data.quarantined`

Producer: DA-13/DA-19/DA-21  
Aggregate: `collection_run` or `record`  
Consumers: review workflows, BO intake blocker

---

## DA quality and publication events

### `da.validation.completed`

Producer: DA-13  
Aggregate: `validation_result`  
Consumers: DA quality, publication gating

### `da.data.quality_scored`

Producer: DA-20  
Aggregate: `data_quality_score`  
Consumers: DA publication, BI

### `da.source.reliability_scored`

Producer: DA-22  
Aggregate: `data_source`  
Consumers: BI, DT, ADI

### `da.provenance.recorded`

Producer: DA-23  
Aggregate: `provenance_record`  
Consumers: audit, BI, DT

### `da.data.published`

Producer: DA-24  
Aggregate: `publication_package`  
Consumers: BO, BI

Payload:

```ts
{
  publicationPackageId: string;
  targetLayer: "business_operations" | "business_intelligence";
  recordCount: number;
  qualityScore: number;
  reliabilityScore: number;
  schemaReferenceId?: string;
  limitations: unknown[];
}
```

---

# 10. BUSINESS OPERATIONS EVENTS

## Business profile and customer events

### `bo.business_profile.updated`

Producer: BO-02  
Aggregate: `business_profile`  
Consumers: BI, DT

### `bo.customer_account.created`

Producer: BO-05  
Aggregate: `customer_account`  
Consumers: BI, DT

### `bo.customer_account.updated`

Producer: BO-05  
Aggregate: `customer_account`  
Consumers: BI, DT

---

## Sales and order events

### `bo.lead.created`

Producer: BO-06  
Aggregate: `lead`  
Consumers: BI

### `bo.lead.converted`

Producer: BO-06  
Aggregate: `lead`  
Consumers: BI

### `bo.opportunity.updated`

Producer: BO-06  
Aggregate: `opportunity`  
Consumers: BI, DT

### `bo.quotation.created`

Producer: BO-07  
Aggregate: `quotation`  
Consumers: BI

### `bo.quotation.accepted`

Producer: BO-07  
Aggregate: `quotation`  
Consumers: BO order management, BI

### `bo.order.created`

Producer: BO-08  
Aggregate: `order`  
Consumers: BI, DT, fulfilment

### `bo.order.completed`

Producer: BO-08  
Aggregate: `order`  
Consumers: BI, DT, OM

### `bo.order.failed`

Producer: BO-08  
Aggregate: `order`  
Consumers: incident handling, BI

---

## Finance and procurement events

### `bo.invoice.issued`

Producer: BO-09  
Aggregate: `invoice`  
Consumers: BI, OM

### `bo.payment.recorded`

Producer: BO-09  
Aggregate: `payment`  
Consumers: BI, DT, OM

### `bo.payment.failed`

Producer: BO-09  
Aggregate: `payment`  
Consumers: incident handling, BI

### `bo.purchase_order.created`

Producer: BO-10  
Aggregate: `purchase_order`  
Consumers: BI, supplier operations

### `bo.goods_received`

Producer: BO-10  
Aggregate: `goods_receipt`  
Consumers: inventory, BI

---

## Inventory and fulfilment events

### `bo.inventory.adjusted`

Producer: BO-12  
Aggregate: `inventory_item`  
Consumers: BI, DT

### `bo.inventory.reserved`

Producer: BO-12  
Aggregate: `inventory_reservation`  
Consumers: fulfilment, DT

### `bo.inventory.shortage_detected`

Producer: BO-12  
Aggregate: `inventory_item`  
Consumers: BI, DT, ADI

### `bo.fulfilment.completed`

Producer: BO-14  
Aggregate: `fulfilment`  
Consumers: BI, OM

### `bo.delivery.completed`

Producer: BO-14  
Aggregate: `delivery`  
Consumers: BI, OM

---

## Workforce, workflow, and incident events

### `bo.task.completed`

Producer: BO-16  
Aggregate: `task`  
Consumers: BI, OM

### `bo.workflow.completed`

Producer: BO-16  
Aggregate: `workflow_instance`  
Consumers: BI, OM

### `bo.capacity.exceeded`

Producer: BO-17  
Aggregate: `resource_allocation`  
Consumers: BI, DT, ADI

### `bo.asset.downtime_recorded`

Producer: BO-18  
Aggregate: `asset`  
Consumers: BI, DT

### `bo.incident.created`

Producer: BO-22  
Aggregate: `incident`  
Consumers: BI, OM

### `bo.incident.resolved`

Producer: BO-22  
Aggregate: `incident`  
Consumers: BI, OM, CL

### `bo.operational_event.published`

Producer: BO-23  
Aggregate: `operational_event`  
Consumers: BI, DT

### `bo.data.published`

Producer: BO-24  
Aggregate: `publication_package`  
Consumers: BI, DT, SIM, ADI

---

# 11. BUSINESS INTELLIGENCE EVENTS

### `bi.metric.calculated`

Producer: BI metric engine  
Aggregate: `metric`  
Consumers: DT, dashboards

### `bi.analysis.completed`

Producer: BI analysis engine  
Aggregate: `analysis`  
Consumers: DT, SIM, ADI

Payload:

```ts
{
  analysisId: string;
  analysisType: string;
  periodStart?: string;
  periodEnd?: string;
  findings: unknown[];
  confidence: number;
  limitations: unknown[];
}
```

### `bi.anomaly.detected`

Producer: BI anomaly engine  
Aggregate: `anomaly`  
Consumers: DT, ADI, OM

### `bi.forecast.generated`

Producer: BI forecasting  
Aggregate: `forecast`  
Consumers: DT, SIM, ADI

### `bi.insight.published`

Producer: BI publication  
Aggregate: `insight_package`  
Consumers: DT, SIM, ADI

---

# 12. BUSINESS DIGITAL TWIN EVENTS

### `dt.entity.created`

Producer: DT entity engine  
Aggregate: `digital_twin_entity`  
Consumers: SIM, ADI

### `dt.entity.updated`

Producer: DT entity engine  
Aggregate: `digital_twin_entity`  
Consumers: SIM, ADI

### `dt.relationship.updated`

Producer: DT relationship engine  
Aggregate: `digital_twin_relationship`  
Consumers: SIM, ADI

### `dt.state.updated`

Producer: DT state engine  
Aggregate: `digital_twin_state`  
Consumers: SIM, ADI

Payload:

```ts
{
  twinId: string;
  stateVersion: number;
  effectiveAt: string;
  stateSnapshotReference: string;
  confidence: number;
  limitations: unknown[];
}
```

### `dt.assumption.updated`

Producer: DT assumption engine  
Aggregate: `twin_assumption`  
Consumers: SIM, ADI

### `dt.calibration.completed`

Producer: DT calibration engine  
Aggregate: `digital_twin`  
Consumers: SIM, ADI, CL

### `dt.snapshot.published`

Producer: DT publication  
Aggregate: `digital_twin_snapshot`  
Consumers: SIM, ADI

---

# 13. SIMULATION EVENTS

### `sim.request.accepted`

Producer: Simulation intake  
Aggregate: `simulation`  
Consumers: simulation runtime

### `sim.simulation.started`

Producer: Simulation runtime  
Aggregate: `simulation`  
Consumers: monitoring

### `sim.scenario.generated`

Producer: Scenario generator  
Aggregate: `scenario`  
Consumers: simulation runtime

### `sim.simulation.completed`

Producer: Simulation runtime  
Aggregate: `simulation`  
Consumers: ADI

Payload:

```ts
{
  simulationId: string;
  scenarioCount: number;
  horizonDays: number;
  resultReference: string;
  confidence: number;
  riskSummary: unknown;
  limitations: unknown[];
}
```

### `sim.simulation.failed`

Producer: Simulation runtime  
Aggregate: `simulation`  
Consumers: incident handling

### `sim.risk.detected`

Producer: Risk simulation  
Aggregate: `simulation_risk`  
Consumers: ADI

### `sim.verdict.generated`

Producer: Verdict support  
Aggregate: `simulation`  
Consumers: ADI

---

# 14. AI DECISION INTELLIGENCE EVENTS

### `adi.analysis.requested`

Producer: ADI intake  
Aggregate: `decision_case`  
Consumers: ADI runtime

### `adi.decision.generated`

Producer: ADI decision engine  
Aggregate: `decision`  
Consumers: ABA

Payload:

```ts
{
  decisionId: string;
  decisionType: string;
  recommendation: unknown;
  alternatives: unknown[];
  confidence: number;
  riskLevel: string;
  evidenceReferences: string[];
  limitations: unknown[];
}
```

### `adi.decision.revised`

Producer: ADI revision engine  
Aggregate: `decision`  
Consumers: ABA

### `adi.decision.blocked`

Producer: ADI governance  
Aggregate: `decision`  
Consumers: audit, review workflow

### `adi.decision.published`

Producer: ADI publication  
Aggregate: `decision_package`  
Consumers: ABA

---

# 15. APPROVED BUSINESS ACTION EVENTS

### `aba.action.submitted`

Producer: ABA intake  
Aggregate: `approved_action`  
Consumers: approval workflow

### `aba.action.approved`

Producer: ABA approval engine  
Aggregate: `approved_action`  
Consumers: execution adapters, OM

Payload:

```ts
{
  approvedActionId: string;
  decisionId: string;
  actionType: string;
  approvedBy: string;
  approvedAt: string;
  executionWindow?: {
    startsAt?: string;
    endsAt?: string;
  };
}
```

### `aba.action.rejected`

Producer: ABA approval engine  
Aggregate: `approved_action`  
Consumers: ADI, audit

### `aba.action.execution_started`

Producer: ABA execution engine  
Aggregate: `approved_action`  
Consumers: OM

### `aba.action.executed`

Producer: ABA execution engine  
Aggregate: `approved_action`  
Consumers: OM

### `aba.action.failed`

Producer: ABA execution engine  
Aggregate: `approved_action`  
Consumers: OM, incident handling

### `aba.action.reversed`

Producer: ABA execution engine  
Aggregate: `approved_action`  
Consumers: OM, CL

---

# 16. OUTCOME MONITORING EVENTS

### `om.monitoring.started`

Producer: OM intake  
Aggregate: `monitoring_case`  
Consumers: OM runtime

### `om.observation.recorded`

Producer: OM observation engine  
Aggregate: `observation`  
Consumers: OM evaluation

### `om.outcome.recorded`

Producer: OM evaluation  
Aggregate: `outcome`  
Consumers: CL

Payload:

```ts
{
  outcomeId: string;
  approvedActionId: string;
  outcomeType: string;
  expectedValue: unknown;
  observedValue: unknown;
  variance: unknown;
  evaluatedAt: string;
  confidence: number;
}
```

### `om.benefit.verified`

Producer: OM benefit engine  
Aggregate: `outcome`  
Consumers: CL

### `om.adverse_outcome.detected`

Producer: OM adverse outcome engine  
Aggregate: `outcome`  
Consumers: CL, incident handling

### `om.action.effectiveness.evaluated`

Producer: OM effectiveness engine  
Aggregate: `approved_action`  
Consumers: CL, ADI

### `om.monitoring.completed`

Producer: OM publication  
Aggregate: `monitoring_case`  
Consumers: CL

---

# 17. CONTINUOUS LEARNING EVENTS

### `cl.learning_item.created`

Producer: CL intake  
Aggregate: `learning_item`  
Consumers: CL classification

### `cl.lesson.classified`

Producer: CL classification  
Aggregate: `learning_item`  
Consumers: CL applicability, confidence

### `cl.learning.confidence_scored`

Producer: CL confidence engine  
Aggregate: `learning_item`  
Consumers: CL governance

### `cl.conflict.detected`

Producer: CL conflict engine  
Aggregate: `learning_conflict`  
Consumers: CL governance

### `cl.assumption.revision_proposed`

Producer: CL assumption engine  
Aggregate: `assumption_revision`  
Consumers: DT, SIM governance

### `cl.rule.update_proposed`

Producer: CL rule learning  
Aggregate: `rule_update`  
Consumers: BI, ADI governance

### `cl.policy.update_proposed`

Producer: CL policy learning  
Aggregate: `policy_update`  
Consumers: ADI, ABA governance

### `cl.model.calibration_proposed`

Producer: CL calibration  
Aggregate: `model_calibration`  
Consumers: BI, DT, SIM

### `cl.learning.approved`

Producer: CL governance  
Aggregate: `learning_item`  
Consumers: controlled deployment

### `cl.learning.rejected`

Producer: CL governance  
Aggregate: `learning_item`  
Consumers: audit

### `cl.learning.deployed`

Producer: CL deployment  
Aggregate: `learning_deployment`  
Consumers: BI, DT, SIM, ADI

### `cl.learning.impact_verified`

Producer: CL impact verification  
Aggregate: `learning_deployment`  
Consumers: CL governance

### `cl.learning.published`

Producer: CL publication  
Aggregate: `learning_package`  
Consumers: BI, DT, SIM, ADI

Payload:

```ts
{
  learningPackageId: string;
  learningType: string;
  targetLayers: string[];
  applicabilityScope: unknown;
  confidence: number;
  reliability: number;
  effectiveFrom?: string;
  limitations: unknown[];
}
```

---

# 18. CROSS-LAYER EVENT CHAIN

Canonical platform flow:

```text
da.data.published
→ bo.business_profile.updated
→ bo.data.published
→ bi.analysis.completed
→ dt.state.updated
→ sim.simulation.completed
→ adi.decision.generated
→ aba.action.approved
→ aba.action.executed
→ om.outcome.recorded
→ cl.learning.published
```

The same `correlationId` must remain traceable across the full chain.

Each event must set `causationId` to the immediately preceding event ID.

---

# 19. Consumer Responsibilities

Every consumer must:

1. validate event type;
2. validate event version;
3. validate tenant and workspace context;
4. validate required business scope;
5. check idempotency;
6. execute within a transaction;
7. write inbox processing state;
8. persist domain changes;
9. emit downstream outbox events atomically;
10. mark processing complete;
11. preserve correlation and causation IDs.

---

# 20. Event Publication Rules

Publish only facts that already occurred.

Correct:

```text
bo.order.completed
```

Incorrect:

```text
bo.complete_order
```

Commands and events must remain separate.

Do not use events as synchronous request-response APIs.

Do not include raw secrets, passwords, access tokens, private keys, or complete payment credentials in event payloads.

---

# 21. Sensitive Data Rules

Events should contain references instead of sensitive bodies where possible.

Use:

```text
fileObjectId
documentReference
customerId
credentialReferenceId
```

Avoid:

```text
raw document bytes
plaintext credentials
full card data
government identity documents
```

Sensitivity metadata must be present for confidential or restricted events.

---

# 22. Event Schema Registry Requirements

For each event type, maintain:

```text
event_type
event_version
schema_name
schema_definition
producer_layer
owner_team
supported_consumers
status
effective_from
deprecated_at
```

Statuses:

```text
draft
active
deprecated
retired
```

Do not delete historical event schemas.

---

# 23. Minimum Initial Implementation Set

Implement these first:

```text
da.data.published
bo.business_profile.updated
bo.order.created
bo.order.completed
bo.payment.recorded
bo.inventory.adjusted
bo.data.published
bi.analysis.completed
dt.state.updated
sim.simulation.completed
adi.decision.generated
aba.action.approved
aba.action.executed
om.outcome.recorded
cl.learning.published
```

This set supports the first full end-to-end platform vertical slice.

---

# 24. Validation Checklist

Before activating an event:

- event name follows standard;
- owner is assigned;
- producer is defined;
- consumers are defined;
- payload schema exists;
- version is declared;
- aggregate type and ID exist;
- tenant and workspace are present;
- correlation ID is present;
- idempotency rule exists;
- retry rule exists;
- dead-letter behavior exists;
- sensitive data classification is defined;
- unit tests exist;
- integration tests exist;
- replay test exists;
- backward compatibility is reviewed.

---

# 25. Next Implementation Task

After approval of this catalogue:

```text
Implement the canonical event contracts in packages/event-contracts,
create the event schema registry, and add contract validation tests.
```
