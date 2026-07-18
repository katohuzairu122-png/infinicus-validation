# Simulation Layer

## Implementation

The Simulation layer is implemented by **INFINICUS Engine v3** — the 90-day Monte Carlo business simulation (500 runs) hosted as a Cloudflare Pages application in the root of the `infinicus-validation` repository.

### Engine location

```
infinicus-validation/          ← repository root
├── index.html                 ← simulation UI + engine entry point
├── functions/                 ← Cloudflare Functions (API routes)
├── business-intelligence/     ← bi-bundle.js
├── approved-business-action/  ← aba-bundle.js
├── outcome-monitoring/        ← om-bundle.js
└── continuous-learning/       ← cl-bundle.js
```

### Namespace

`window.INFINICUS.SIMULATION.*`

### Key capabilities

- 90-day Monte Carlo projection (500 runs)
- Revenue, cost, cash-flow, risk, score, verdict, forecast, sensitivity, scenario comparison
- Receives Digital Twin packages via `window.INFINICUS.SIMULATION.receiveDigitalTwinPackage()`
- Publishes results to BI, ABA, OM, CL layers via registered handoff hooks

### Integration

The v3 engine is the authoritative SIM implementation. No separate block zips exist for this layer. Future platform migration work will extract simulation logic into typed TypeScript blocks following the §6 block structure when instructed.
