# INFINICUS Architecture Manifest

## Layer chain

```
DAL → BO → BI → DT → SIM → ADI → ABA → OM → CL
 └─────────────────── feedback loop ───────────────────────┘
```

## Layer registry

| # | ID  | Package name                               | Handoff out       |
|---|-----|--------------------------------------------|-------------------|
| 1 | DAL | `@infinicus/layer-data-acquisition`        | `dal-to-bo`       |
| 2 | BO  | `@infinicus/layer-business-operations`     | `bo-to-bi`        |
| 3 | BI  | `@infinicus/layer-business-intelligence`   | `bi-to-dt`        |
| 4 | DT  | `@infinicus/layer-business-digital-twin`   | `dt-to-sim`       |
| 5 | SIM | `@infinicus/layer-simulation`              | `sim-to-adi`      |
| 6 | ADI | `@infinicus/layer-ai-decision-intelligence`| `adi-to-aba`      |
| 7 | ABA | `@infinicus/layer-approved-business-action`| `aba-to-om`       |
| 8 | OM  | `@infinicus/layer-outcome-monitoring`      | `om-to-cl`        |
| 9 | CL  | `@infinicus/layer-continuous-learning`     | `cl-feedback`     |

## Canonical event prefixes

| Layer | Prefix       | Example event             |
|-------|--------------|---------------------------|
| DAL   | `da.*`       | `da.data.published`       |
| BO    | `bo.*`       | `bo.order.completed`      |
| BI    | `bi.*`       | `bi.insight.published`    |
| DT    | `dt.*`       | `dt.state.updated`        |
| SIM   | `simulation.*`| `simulation.completed`   |
| ADI   | `adi.*`      | `adi.decision.generated`  |
| ABA   | `aba.*`      | `aba.action.approved`     |
| OM    | `om.*`       | `om.outcome.evaluated`    |
| CL    | `cl.*`       | `cl.learning.published`   |

## Shared package dependency rules

```
shared-types        ← no platform deps
configuration       ← shared-types
database            ← shared-types, configuration
event-contracts     ← shared-types
handoff-contracts   ← shared-types, event-contracts
authentication      ← shared-types, configuration
authorization       ← shared-types, authentication
observability       ← shared-types, configuration
testing             ← shared-types, handoff-contracts, event-contracts
```

## Block structure (per layer)

Each block inside a layer follows:

```
block-name/
├── src/
│   ├── domain/          entities, value objects, domain rules
│   ├── application/     use cases, orchestration, services
│   ├── infrastructure/  persistence, adapters, external integrations
│   ├── contracts/       public inputs, outputs, events, handoffs
│   └── index.ts         public exports only
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

## Canonical types

All defined in `@infinicus/shared-types`. See source for full definitions:

- `BaseRecord` — base fields for every persistent record
- `LineageEntry` — provenance chain entry
- `LayerHandoff<T>` — cross-layer handoff envelope
- `PlatformEvent<T>` — platform event envelope
- `LayerId` — union of all nine layer identifiers

## Status: Foundation complete

- [x] Root workspace configuration
- [x] All required directories
- [x] Shared package placeholders with canonical types
- [x] Layer placeholders with dependency chain
- [x] Workspace validation script
- [ ] Layer block import (next task)
- [ ] Database schema
- [ ] Authentication wiring
- [ ] Event backbone
- [ ] Frontend expansion
