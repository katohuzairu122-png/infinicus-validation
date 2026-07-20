# INFINICUS LAYER HANDOFF CONTRACTS

Version: 1.0.0  
Status: Architecture baseline  
Scope: Canonical cross-layer package contracts for the nine-layer INFINICUS platform

## 1. Purpose

This document defines formal handoff contracts between adjacent and controlled non-adjacent INFINICUS layers. It governs package identity, schema versioning, tenant and workspace context, business scope, provenance, quality, confidence, limitations, validation, acknowledgement, rejection, retries, idempotency, correlation, and causation.

The objective is to prevent direct database coupling and uncontrolled internal payloads between layers.

## 2. Canonical handoff envelope

```ts
export interface LayerHandoff<TPayload = unknown> {
  handoffId: string;
  handoffType: string;
  handoffVersion: number;
  sourceLayer: PlatformLayer;
  sourceBlock: string;
  targetLayer: PlatformLayer;
  targetBlock?: string;
  tenantId: string;
  workspaceId: string;
  businessId?: string;
  correlationId: string;
  causationId?: string;
  packageId: string;
  packageType: string;
  packageVersion: number;
  status: HandoffStatus;
  provenance: HandoffProvenance;
  quality: HandoffQuality;
  applicability: HandoffApplicability;
  limitations: HandoffLimitation[];
  payload: TPayload;
  createdAt: string;
  publishedAt?: string;
  acknowledgedAt?: string;
  rejectedAt?: string;
  metadata: HandoffMetadata;
}
```

## 3. Shared types

```ts
export type HandoffStatus =
  | "draft"
  | "ready"
  | "published"
  | "received"
  | "validated"
  | "acknowledged"
  | "rejected"
  | "failed"
  | "revoked";

export interface HandoffProvenance {
  sourceSystem: string;
  sourceRecordIds: string[];
  sourcePackageIds?: string[];
  evidenceReferences: string[];
  transformationReferences?: string[];
  lineageDepth: number;
  generatedBy: {
    actorType: "user" | "service_account" | "system" | "integration";
    actorId?: string;
  };
}

export interface HandoffQuality {
  overallScore: number;
  completeness?: number;
  validity?: number;
  consistency?: number;
  timeliness?: number;
  uniqueness?: number;
  reliability?: number;
  confidence?: number;
  scoringMethod?: string;
  scoredAt?: string;
}

export interface HandoffApplicability {
  scopeType:
    | "platform"
    | "tenant"
    | "workspace"
    | "business"
    | "department"
    | "location"
    | "process"
    | "entity"
    | "scenario";
  scopeIds: string[];
  effectiveFrom?: string;
  effectiveTo?: string;
  jurisdiction?: string[];
  assumptions?: string[];
}

export interface HandoffLimitation {
  code: string;
  severity: "info" | "warning" | "high" | "critical";
  description: string;
  affectedFields?: string[];
  mitigation?: string;
}

export interface HandoffMetadata {
  schemaName: string;
  schemaVersion: number;
  eventId?: string;
  idempotencyKey: string;
  traceId?: string;
  sensitivity: "public" | "internal" | "confidential" | "restricted";
  retentionCategory?: string;
}
```

## 4. Universal contract rules

Every handoff must:

1. contain tenant and workspace identity;
2. contain a business ID when business-specific;
3. preserve correlation ID across the full platform chain;
4. set causation ID to the event or handoff that directly caused it;
5. identify source and target layers;
6. identify the source block;
7. include package type and version;
8. include provenance;
9. include quality or confidence;
10. disclose limitations;
11. include an idempotency key;
12. validate against a registered schema;
13. be persisted before publication;
14. receive acknowledgement or rejection;
15. never contain raw secrets;
16. never permit the target layer to mutate source-owned data.

## 5. Ownership rules

The source layer owns package construction, package truth, provenance, quality scoring, publication, and revocation.

The target layer owns validation, acceptance, acknowledgement, rejection reason, downstream transformation, and local persistence.

The target must not silently alter the source package.

## 6. Validation outcomes

A receiving layer must return one of:

```text
acknowledged
rejected
failed
```

Rejection categories:

```text
unsupported_version
schema_invalid
tenant_mismatch
workspace_mismatch
business_scope_invalid
quality_below_threshold
confidence_below_threshold
provenance_incomplete
duplicate_package
expired_package
unsupported_package_type
policy_blocked
```

Transient infrastructure failure is `failed`, not `rejected`.

## 7. Idempotency

Canonical idempotency key:

```text
<handoffType>:<packageId>:<packageVersion>:<targetLayer>
```

A target layer must not successfully process the same package version more than once.

## 8. Contract registry

Every contract must register:

```text
handoff_type
handoff_version
package_type
package_version
source_layer
target_layer
schema_name
schema_definition
minimum_quality_score
minimum_confidence
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

## 9. DA → BO

Contract:

```text
da-to-bo.business-intake-package
```

Producer: DA-24  
Consumer: BO-02  
Primary event: `da.data.published`

Purpose: transfer validated and normalized operational business data while preserving quality and provenance.

```ts
export interface DataAcquisitionToBusinessOperationsPayload {
  publicationPackageId: string;
  dataSourceIds: string[];
  collectionRunIds: string[];
  businessIdentity?: {
    legalName?: string;
    tradingName?: string;
    businessCode?: string;
    industry?: string;
    legalStructure?: string;
  };
  operatingContext?: {
    operatingModel?: string;
    revenueModel?: string;
    customerModel?: string;
    supplyModel?: string;
    currencies?: string[];
    locations?: unknown[];
    operatingHours?: unknown[];
  };
  operationalRecords: Array<{
    recordType: string;
    sourceRecordId: string;
    canonicalEntityReference?: string;
    data: unknown;
    qualityScore: number;
    provenanceReference: string;
  }>;
  schemaReferenceId: string;
}
```

Acceptance requires sufficient quality, valid provenance, required business context, no unresolved critical validation issue, and matching tenant/workspace scope.

## 10. DA → BI

Contract:

```text
da-to-bi.analytics-source-package
```

```ts
export interface DataAcquisitionToBusinessIntelligencePayload {
  publicationPackageId: string;
  schemaReferenceId: string;
  sourceReliability: Array<{
    dataSourceId: string;
    reliabilityScore: number;
  }>;
  datasets: Array<{
    datasetType: string;
    recordCount: number;
    dataReference: string;
    qualityScore: number;
    timeRange?: { start: string; end: string };
    dimensions?: string[];
    measures?: string[];
  }>;
}
```

## 11. BO → BI

Contract:

```text
bo-to-bi.operational-intelligence-package
```

```ts
export interface BusinessOperationsToBusinessIntelligencePayload {
  publicationPackageId: string;
  reportingPeriod?: { start: string; end: string };
  operationalDomains: Array<{
    domain:
      | "sales"
      | "finance"
      | "procurement"
      | "inventory"
      | "fulfilment"
      | "workforce"
      | "workflow"
      | "assets"
      | "support"
      | "risk"
      | "incidents";
    recordCount: number;
    dataReference: string;
    qualityScore: number;
  }>;
  metricReferences?: string[];
  eventReferences?: string[];
}
```

## 12. BO → DT

Contract:

```text
bo-to-dt.operational-state-package
```

```ts
export interface BusinessOperationsToDigitalTwinPayload {
  publicationPackageId: string;
  effectiveAt: string;
  entityStates: Array<{
    entityType: string;
    entityId: string;
    stateVersion: number;
    state: unknown;
    lastChangedAt: string;
  }>;
  relationshipChanges: Array<{
    relationshipType: string;
    fromEntityId: string;
    toEntityId: string;
    state: "active" | "inactive" | "removed";
    effectiveAt: string;
  }>;
  operationalSignals: Array<{
    signalType: string;
    value: unknown;
    observedAt: string;
    confidence?: number;
  }>;
}
```

## 13. BI → DT

Contract:

```text
bi-to-dt.intelligence-calibration-package
```

```ts
export interface BusinessIntelligenceToDigitalTwinPayload {
  intelligencePackageId: string;
  analyses: Array<{
    analysisId: string;
    analysisType: string;
    findings: unknown[];
    confidence: number;
  }>;
  forecasts: Array<{
    forecastId: string;
    targetType: string;
    targetId?: string;
    horizon: string;
    valuesReference: string;
    confidence: number;
  }>;
  anomalies: Array<{
    anomalyId: string;
    anomalyType: string;
    severity: string;
    affectedEntityIds: string[];
    detectedAt: string;
  }>;
}
```

## 14. BI → SIM

Contract:

```text
bi-to-sim.forecast-and-analysis-package
```

```ts
export interface BusinessIntelligenceToSimulationPayload {
  intelligencePackageId: string;
  baselinePeriod: { start: string; end: string };
  metrics: Array<{
    metricCode: string;
    value: number;
    unit?: string;
    measuredAt: string;
  }>;
  forecasts: unknown[];
  trends: unknown[];
  anomalies: unknown[];
  assumptionRecommendations: unknown[];
}
```

## 15. DT → SIM

Contract:

```text
dt-to-sim.business-state-snapshot
```

```ts
export interface DigitalTwinToSimulationPayload {
  twinId: string;
  snapshotId: string;
  stateVersion: number;
  effectiveAt: string;
  entities: Array<{
    entityType: string;
    entityId: string;
    state: unknown;
  }>;
  relationships: Array<{
    relationshipType: string;
    fromEntityId: string;
    toEntityId: string;
    attributes?: unknown;
  }>;
  assumptions: Array<{
    assumptionId: string;
    name: string;
    value: unknown;
    confidence: number;
  }>;
  constraints: unknown[];
  baselineMetrics: unknown[];
}
```

## 16. SIM → ADI

Contract:

```text
sim-to-adi.simulation-result-package
```

```ts
export interface SimulationToDecisionIntelligencePayload {
  simulationId: string;
  simulationVersion: number;
  horizonDays: number;
  scenarioCount: number;
  scenarios: Array<{
    scenarioId: string;
    name: string;
    probability?: number;
    resultReference: string;
  }>;
  projections: {
    revenue?: unknown;
    cost?: unknown;
    cashFlow?: unknown;
    demand?: unknown;
    capacity?: unknown;
    inventory?: unknown;
  };
  riskSummary: Array<{
    riskType: string;
    likelihood: number;
    impact: number;
    severity: string;
  }>;
  sensitivityResults: unknown[];
  stressTestResults: unknown[];
  verdictSupport: {
    recommendedVerdict: "go" | "modify" | "stop";
    confidence: number;
    reasons: string[];
  };
}
```

## 17. BI → ADI

Contract:

```text
bi-to-adi.decision-intelligence-input
```

```ts
export interface BusinessIntelligenceToDecisionIntelligencePayload {
  intelligencePackageId: string;
  findings: unknown[];
  anomalies: unknown[];
  forecasts: unknown[];
  metrics: unknown[];
  confidence: number;
  evidenceReferences: string[];
}
```

## 18. DT → ADI

Contract:

```text
dt-to-adi.business-state-context
```

```ts
export interface DigitalTwinToDecisionIntelligencePayload {
  twinId: string;
  snapshotId: string;
  stateVersion: number;
  businessStateReference: string;
  assumptions: unknown[];
  constraints: unknown[];
  activeRisks: unknown[];
  confidence: number;
}
```

## 19. ADI → ABA

Contract:

```text
adi-to-aba.decision-approval-package
```

```ts
export interface DecisionIntelligenceToApprovedActionPayload {
  decisionId: string;
  decisionVersion: number;
  decisionType: string;
  recommendation: {
    title: string;
    description: string;
    actionType: string;
    actionPayload: unknown;
  };
  alternatives: Array<{
    title: string;
    description: string;
    tradeoffs: unknown[];
  }>;
  confidence: number;
  riskLevel: string;
  evidenceReferences: string[];
  simulationReferences?: string[];
  requiredApprovals: Array<{
    roleCode: string;
    sequence: number;
  }>;
  executionConstraints?: unknown[];
  expirationAt?: string;
}
```

## 20. ABA → OM

Contract:

```text
aba-to-om.executed-action-package
```

```ts
export interface ApprovedActionToOutcomeMonitoringPayload {
  approvedActionId: string;
  decisionId: string;
  actionType: string;
  actionVersion: number;
  approval: {
    approvedBy: string;
    approvedAt: string;
    approvalChainReference: string;
  };
  execution: {
    status: "approved" | "started" | "executed" | "failed" | "reversed";
    startedAt?: string;
    completedAt?: string;
    executorReference?: string;
    executionEvidenceReferences?: string[];
  };
  expectedOutcomes: Array<{
    outcomeType: string;
    targetValue: unknown;
    expectedBy?: string;
    measurementMethod: string;
  }>;
  monitoringPlan: {
    observationFrequency?: string;
    evaluationDates?: string[];
    stopConditions?: unknown[];
  };
}
```

## 21. OM → CL

Contract:

```text
om-to-cl.outcome-learning-package
```

```ts
export interface OutcomeMonitoringToContinuousLearningPayload {
  monitoringCaseId: string;
  approvedActionId: string;
  decisionId: string;
  observations: Array<{
    observationId: string;
    observationType: string;
    value: unknown;
    observedAt: string;
    confidence: number;
  }>;
  outcomes: Array<{
    outcomeId: string;
    outcomeType: string;
    expectedValue: unknown;
    observedValue: unknown;
    variance: unknown;
    confidence: number;
  }>;
  benefitAssessment?: unknown;
  adverseOutcomes?: unknown[];
  effectivenessAssessment: unknown;
  evidenceReferences: string[];
}
```

## 22. CL → BI

Contract:

```text
cl-to-bi.analytics-learning-update
```

```ts
export interface ContinuousLearningToBusinessIntelligencePayload {
  learningPackageId: string;
  approvedLearningItems: Array<{
    learningItemId: string;
    learningType: string;
    targetModel?: string;
    targetRule?: string;
    proposedChange: unknown;
    confidence: number;
    reliability: number;
  }>;
  effectiveFrom: string;
  rollbackReference?: string;
}
```

## 23. CL → DT

Contract:

```text
cl-to-dt.twin-calibration-update
```

```ts
export interface ContinuousLearningToDigitalTwinPayload {
  learningPackageId: string;
  assumptionRevisions: unknown[];
  relationshipRevisions: unknown[];
  stateInterpretationUpdates: unknown[];
  calibrationChanges: unknown[];
  confidence: number;
  reliability: number;
}
```

## 24. CL → SIM

Contract:

```text
cl-to-sim.simulation-calibration-update
```

```ts
export interface ContinuousLearningToSimulationPayload {
  learningPackageId: string;
  parameterUpdates: unknown[];
  distributionUpdates: unknown[];
  riskModelUpdates: unknown[];
  scenarioGenerationUpdates: unknown[];
  calibrationEvidence: string[];
  confidence: number;
  reliability: number;
}
```

## 25. CL → ADI

Contract:

```text
cl-to-adi.decision-policy-update
```

```ts
export interface ContinuousLearningToDecisionIntelligencePayload {
  learningPackageId: string;
  policyUpdates: unknown[];
  ruleUpdates: unknown[];
  confidenceCalibration: unknown[];
  riskThresholdUpdates: unknown[];
  applicabilityScope: unknown;
  effectiveFrom: string;
  rollbackReference?: string;
}
```

## 26. Acknowledgement

Event:

```text
platform.handoff.acknowledged
```

```ts
export interface HandoffAcknowledgementPayload {
  handoffId: string;
  packageId: string;
  sourceLayer: PlatformLayer;
  targetLayer: PlatformLayer;
  receivedVersion: number;
  processedAt: string;
  targetRecordReferences: string[];
}
```

## 27. Rejection

Event:

```text
platform.handoff.rejected
```

```ts
export interface HandoffRejectionPayload {
  handoffId: string;
  packageId: string;
  sourceLayer: PlatformLayer;
  targetLayer: PlatformLayer;
  rejectionCode: string;
  rejectionMessage: string;
  retryable: boolean;
  rejectedAt: string;
  validationErrors?: Array<{
    field: string;
    code: string;
    message: string;
  }>;
}
```

## 28. Revocation

Event:

```text
platform.handoff.revoked
```

```ts
export interface HandoffRevocationPayload {
  handoffId: string;
  packageId: string;
  packageVersion: number;
  reason: string;
  revokedAt: string;
  replacementPackageId?: string;
}
```

Targets must preserve historical receipt and mark the package revoked.

## 29. Default quality thresholds

```text
DA → BO overall quality: 0.80
DA → BI overall quality: 0.75
BO → BI overall quality: 0.80
BO → DT overall quality: 0.85
BI → DT confidence: 0.70
DT → SIM confidence: 0.75
SIM → ADI confidence: 0.65
ADI → ABA confidence: policy-based, default 0.70
OM → CL confidence: 0.70
CL deployment reliability: 0.80
```

Tenant policy may raise thresholds but must not lower governance-critical thresholds below platform minimums.

## 30. Persistence requirements

Each layer must persist:

```text
outbound handoff record
published package
delivery attempts
acknowledgement
rejection
revocation
target processing status
correlation ID
causation ID
schema version
```

No handoff should exist only in memory.

## 31. Security rules

Handoff payloads must not contain plaintext passwords, access tokens, raw API keys, private keys, full payment card data, unrestricted identity documents, or binary file bodies.

Use secure references instead.

## 32. Testing requirements

Each contract requires:

1. schema validation;
2. supported-version validation;
3. unsupported-version rejection;
4. tenant mismatch rejection;
5. workspace mismatch rejection;
6. duplicate package handling;
7. quality-threshold validation;
8. confidence-threshold validation;
9. provenance completeness validation;
10. acknowledgement handling;
11. rejection handling;
12. retry handling;
13. dead-letter handling;
14. revocation handling;
15. correlation and causation preservation.

## 33. First vertical slice

Implement and verify:

```text
DA → BO
BO → BI
BI → DT
DT → SIM
SIM → ADI
ADI → ABA
ABA → OM
OM → CL
```

Minimum package chain:

```text
da-to-bo.business-intake-package
bo-to-bi.operational-intelligence-package
bi-to-dt.intelligence-calibration-package
dt-to-sim.business-state-snapshot
sim-to-adi.simulation-result-package
adi-to-aba.decision-approval-package
aba-to-om.executed-action-package
om-to-cl.outcome-learning-package
```

## 34. Implementation order

1. define shared handoff types;
2. create Zod schemas;
3. create contract registry;
4. create acknowledgement, rejection, and revocation contracts;
5. implement DA → BO;
6. implement BO → BI;
7. implement BI → DT;
8. implement DT → SIM;
9. implement SIM → ADI;
10. implement ADI → ABA;
11. implement ABA → OM;
12. implement OM → CL;
13. implement CL feedback contracts;
14. add integration tests;
15. wire persistence and event publication.

## 35. Next implementation task

```text
Implement the canonical handoff contracts in packages/handoff-contracts,
including Zod validation, the contract registry, acknowledgement, rejection,
revocation, and contract tests.
```
