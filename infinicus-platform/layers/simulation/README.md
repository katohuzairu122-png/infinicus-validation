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

---

## BUILD-07 — Typed integration boundary (completed 2026-07-21)

The layer now exposes a typed public API around Engine v3
(spec: `docs/implementation-queue/BUILD-07-SIM-SPECIFICATION.md`):

- **Ports** — `ExecuteSimulationScenarioPort` (ADI-16 entry) and
  `ReadCompletedSimulationRunPort` (ADI-06 entry) in `src/contracts/ports.ts`
- **Adapter** — `createEngineV3BrowserAdapter({ resolveEngine })` in
  `src/infrastructure/engine-v3-browser-adapter.ts`; the only place that may
  touch `window.INFINICUS.SIMULATION`, injectable for test doubles
- **Handoff** — `SIMToADIHandoff` (strict, versioned, validated) in
  `@infinicus/handoff-contracts`; built by
  `mapCompletedRunToSIMToADIHandoff` in `src/application/sim-to-adi-mapper.ts`
- **Errors** — typed `SimulationIntegrationError` family in
  `src/contracts/errors.ts`

The root `index.html` gained a minimal namespaced facade
(`INFINICUS.SIMULATION.executeScenario` / `getCompletedRun` /
`capabilities`) that delegates to the existing `simulate()` and
`monteCarlo()` functions — the Monte Carlo engine (500 runs, 90 days)
is unchanged, and seeding remains unsupported (`randomSeed: null`).
The ADI bundle bootstrap wires ADI-06/ADI-16 through these ports
(`INFINICUS.ADI.simulationPorts`), replacing the previous
"not connected" stubs.

Simulation produces scenarios, projections, uncertainty and outcome
evidence. ADI evaluates that evidence — no recommendation or approval
authority exists in this layer.

Tests: `pnpm --filter @infinicus/layer-simulation test` (adapter/mapper/ports),
`pnpm --filter @infinicus/handoff-contracts test` (contract), plus root
integration tests under `ai-decision-intelligence/INFINICUS-ADI-06-*/tests/`
and `INFINICUS-ADI-16-*/tests/` that exercise the real engine via
`ai-decision-intelligence/sim-integration-harness.mjs`.
