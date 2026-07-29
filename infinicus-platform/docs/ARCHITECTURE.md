# INFINICUS Platform Architecture

## Layer Chain

```
DAL → BO → BI → DT → SIM → ADI → ABA → OM → CL → (feedback loop)
```

| Layer | Package | Description |
|-------|---------|-------------|
| DAL   | `@infinicus/layer-data-acquisition`        | Raw data ingestion |
| BO    | `@infinicus/layer-business-operations`     | Operational context |
| BI    | `@infinicus/layer-business-intelligence`   | Analytics & KPIs |
| DT    | `@infinicus/layer-business-digital-twin`   | Live business model |
| SIM   | `@infinicus/layer-simulation`              | Monte Carlo engine |
| ADI   | `@infinicus/layer-ai-decision-intelligence`| Decision scoring |
| ABA   | `@infinicus/layer-approved-business-action`| Action governance |
| OM    | `@infinicus/layer-outcome-monitoring`      | Outcome tracking |
| CL    | `@infinicus/layer-continuous-learning`     | Feedback & calibration |

## Monorepo Layout

- **apps/** — deployable applications (web, admin, API)
- **layers/** — one package per INFINICUS platform layer
- **packages/** — shared utilities consumed by apps and layers
- **infrastructure/** — deployment and IaC
- **tests/** — cross-layer integration and E2E tests
- **docs/** — architecture docs and ADRs
