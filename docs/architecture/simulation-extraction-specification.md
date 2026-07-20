# INFINICUS SIMULATION EXTRACTION SPECIFICATION

Version: 1.0.0  
Status: Prepared for implementation  
Scope: Extraction of INFINICUS Engine v3 into a formal Simulation layer

## 1. Objective

Convert the existing INFINICUS Engine v3 simulation capability into a modular monorepo layer without breaking the current engine.

Target path:

```text
layers/simulation/
```

The extracted layer must preserve the existing 90-day simulation and Monte Carlo behavior until changes are separately versioned and validated.

## 2. Non-negotiable preservation rules

Do not alter existing v3 logic during extraction for:

- 90-day horizon;
- Monte Carlo sampling;
- revenue, cost, and cash-flow calculations;
- risk scoring;
- Go / Modify / Stop verdict support;
- scenario assumptions;
- existing user-visible outputs.

First reproduce current behavior. Improvements belong to later versions.

Create characterization tests against the existing v3 engine before moving logic.

## 3. Target block architecture

```text
SIM-01 Simulation Core Runtime and Registry
SIM-02 Simulation Request Intake
SIM-03 Business Context Loader
SIM-04 Assumption Registry
SIM-05 Variable Definition Engine
SIM-06 Scenario Generation Engine
SIM-07 Monte Carlo Execution Engine
SIM-08 Time-Series Projection Engine
SIM-09 Revenue Simulation Engine
SIM-10 Cost Simulation Engine
SIM-11 Cash-Flow Simulation Engine
SIM-12 Demand Simulation Engine
SIM-13 Capacity Simulation Engine
SIM-14 Workforce Simulation Engine
SIM-15 Inventory Simulation Engine
SIM-16 Risk Event Simulation Engine
SIM-17 Sensitivity Analysis Engine
SIM-18 Stress Testing Engine
SIM-19 Scenario Comparison Engine
SIM-20 Confidence and Reliability Engine
SIM-21 Result Interpretation Engine
SIM-22 Go / Modify / Stop Verdict Support
SIM-23 Evidence and Provenance Registry
SIM-24 Result Publication and Handoff
SIM-25 Master Integration and Deployment
```

## 4. Required inputs

Simulation receives controlled inputs from:

```text
BI → SIM: forecasts, trends, anomalies, metrics
DT → SIM: twin snapshot, entities, relationships, constraints, assumptions
User/API → SIM: simulation request, horizon, scenario controls
CL → SIM: approved calibration updates only
```

Every input must include tenant, workspace, business, correlation, provenance, quality, and version data.

## 5. Required outputs

Simulation publishes:

```text
sim.simulation.started
sim.scenario.generated
sim.risk.detected
sim.sensitivity.completed
sim.stress_test.completed
sim.simulation.completed
sim.simulation.failed
sim.verdict.generated
sim.data.published
```

Primary handoff:

```text
sim-to-adi.simulation-result-package
```

## 6. Core domain contracts

```ts
interface SimulationRequest {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  correlationId: string;
  horizonDays: number;
  scenarioSetId?: string;
  twinSnapshotId: string;
  intelligencePackageIds: string[];
  assumptionSetId: string;
  requestedAt: string;
}

interface SimulationScenario {
  id: string;
  name: string;
  probability?: number;
  assumptions: Record<string, unknown>;
  constraints: Record<string, unknown>;
}

interface SimulationResult {
  simulationId: string;
  scenarioCount: number;
  horizonDays: number;
  projections: Record<string, unknown>;
  risks: unknown[];
  sensitivity: unknown[];
  stressTests: unknown[];
  confidence: number;
  limitations: unknown[];
  verdictSupport: "go" | "modify" | "stop";
}
```

## 7. Determinism and reproducibility

Persist:

- random seed;
- engine version;
- model version;
- assumption-set version;
- variable definitions;
- distribution parameters;
- scenario definition;
- source snapshot IDs;
- code release;
- run timestamps.

A rerun with the same inputs and seed must reproduce the same result within documented numeric tolerances.

## 8. Monte Carlo requirements

The execution engine must support:

- configurable iteration count;
- deterministic seed;
- bounded concurrency;
- batch execution;
- partial progress;
- cancellation;
- timeout;
- failed-iteration tracking;
- summary statistics;
- percentile outputs;
- distribution diagnostics.

Do not store every iteration indefinitely by default. Apply retention policies and preserve aggregate evidence.

## 9. Projection domains

Each domain must be independently testable:

```text
Revenue
Cost
Cash flow
Demand
Capacity
Workforce
Inventory
Risk events
```

All domain outputs must carry units, currency where relevant, dates, scenario identity, and confidence.

## 10. Verdict separation

Simulation may generate verdict support:

```text
go
modify
stop
```

It must not approve or execute business action.

Ownership remains:

```text
SIM: scenario evidence and verdict support
ADI: recommendation
ABA: approval and authorization
```

## 11. Database requirements

Stage 2F must persist:

- requests and runs;
- attempts;
- input packages;
- assumptions and versions;
- variable definitions and values;
- distributions;
- scenario sets;
- Monte Carlo batches;
- projections;
- risks;
- sensitivity runs;
- stress tests;
- findings;
- limitations;
- confidence;
- verdict support;
- provenance;
- publication packages;
- deployment records.

## 12. Extraction sequence

### Phase 1 — Discovery

- locate all simulation code in v3;
- identify pure calculations;
- identify DOM dependencies;
- identify browser-storage dependencies;
- identify AI calls;
- identify configuration constants;
- identify verdict logic.

### Phase 2 — Characterization

Create golden tests for representative business cases:

- strong business;
- weak business;
- high-growth but cash-constrained;
- inventory-heavy;
- service business;
- zero-revenue edge case;
- high-risk edge case.

Capture expected outputs before refactoring.

### Phase 3 — Pure core

Move pure calculations into:

```text
layers/simulation/core/
```

No DOM, network, storage, or UI dependencies.

### Phase 4 — Domain modules

Separate revenue, cost, cash flow, demand, capacity, workforce, inventory, and risk modules.

### Phase 5 — Orchestration

Create a runtime that loads versioned inputs, executes scenarios, aggregates results, and publishes events.

### Phase 6 — Persistence

Connect Stage 2F repositories and transaction-safe outbox publication.

### Phase 7 — Compatibility adapter

Keep the current v3 interface working through an adapter while the new layer is verified.

### Phase 8 — Cutover

Switch v3 UI/API to the extracted layer only after parity tests pass.

## 13. Test requirements

- characterization parity tests;
- deterministic seed tests;
- numeric boundary tests;
- invalid-input tests;
- 90-day horizon tests;
- scenario comparison tests;
- risk aggregation tests;
- sensitivity tests;
- stress-test tests;
- verdict-support tests;
- repository integration tests;
- RLS tests;
- outbox atomicity tests;
- full SIM → ADI handoff test.

## 14. Stop conditions

Extraction is complete only when:

- v3 outputs are reproduced within tolerance;
- no simulation core depends on DOM or IndexedDB;
- Stage 2F persistence passes live PostgreSQL tests;
- events and handoffs validate;
- current v3 remains operational through the compatibility adapter;
- SIM-01 through SIM-25 are represented in the monorepo;
- migration range is frozen.
