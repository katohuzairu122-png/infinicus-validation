# BUILD-07 Completion Report — Simulation Layer Integration Cleanup

- **Build ID:** BUILD-07
- **Layer:** SIM (Simulation)
- **Date:** 2026-07-21
- **Branch:** `claude/infinicus-engine-debug-3loqb4`
- **Specification:** `docs/implementation-queue/BUILD-07-SIM-SPECIFICATION.md` (followed exactly; not modified)
- **Status:** COMPLETED

## What Was Built

Engine v3 (root `index.html`, `window.INFINICUS.SIMULATION.*`) is now
integrated with the modular architecture and the completed ADI layer through
typed ports, a narrow browser adapter, a minimal namespaced facade, and a
strict versioned SIM-to-ADI handoff contract. The Monte Carlo engine itself
was not touched: `index.html` received **101 inserted lines, 0 deletions** —
the facade only delegates to the existing `simulate()` and `monteCarlo()`
functions.

### Files created

| File | Purpose |
|---|---|
| `infinicus-platform/layers/simulation/src/contracts/ports.ts` | `ExecuteSimulationScenarioPort`, `ReadCompletedSimulationRunPort`, `EngineV3Parameters`, `SimulationScenarioRequest`, `CompletedSimulationRun`, request validation |
| `infinicus-platform/layers/simulation/src/contracts/errors.ts` | 8 typed `SimulationIntegrationError` classes (unavailable engine/operation, invalid request/result, not-found, not-completed, tenant boundary) |
| `infinicus-platform/layers/simulation/src/infrastructure/engine-v3-browser-adapter.ts` | Narrow adapter over injected `EngineV3SimulationGlobal`; isolates all global access; test-double friendly; values pass through unaltered |
| `infinicus-platform/layers/simulation/src/application/sim-to-adi-mapper.ts` | Completed-run → `SIMToADIHandoff` mapper; validates against the contract before returning |
| `infinicus-platform/layers/simulation/tests/engine-v3-adapter.test.ts` | 26 Vitest tests (ports, adapter, mapper, rejections, parity) |
| `infinicus-platform/packages/handoff-contracts/tests/sim-to-adi.contract.test.ts` | 14 Vitest tests (contract types + runtime validation) |
| `ai-decision-intelligence/sim-integration-harness.mjs` | Extracts the REAL engine core + facade from `index.html` into a VM for characterization tests |
| `ai-decision-intelligence/INFINICUS-ADI-06-.../tests/sim-facade-integration.test.mjs` | End-to-end: real engine → facade → bundle wiring → ADI-06 validation |
| `ai-decision-intelligence/INFINICUS-ADI-16-.../tests/sim-orchestration-integration.test.mjs` | ADI-16 port: execute, idempotent replay, missing-parameter/engine failures |

### Files modified

| File | Change |
|---|---|
| `infinicus-platform/packages/handoff-contracts/src/sim-to-adi.ts` | Placeholder (`correlationId` + TODO) replaced with strict versioned contract (`SIM_TO_ADI_CONTRACT_VERSION` 1.0.0): run identity/versioning, input snapshot, outcome/percentile/risk evidence, optional sensitivity, limitations, provenance, `validateSIMToADIHandoff` with explicit reasons + serializability check + forbidden recommendation/approval fields |
| `infinicus-platform/layers/simulation/src/index.ts` | Public API exports (LAYER_ID preserved) |
| `index.html` | BUILD-07 facade only (additive): `SIMULATION.executeScenario` / `getCompletedRun` / `capabilities` / run registry with idempotency-key replay and tenant-boundary checks; delegates to existing `simulate`/`monteCarlo` |
| `ai-decision-intelligence/adi-bundle.js` | Bootstrap: "not connected" stubs for ADI-06/ADI-16 replaced with facade-delegating port adapters (`ADI.simulationPorts`); `window` access isolated in the bootstrap; deterministic `SIM_ENGINE_UNAVAILABLE` / `SIM_ENGINE_OPERATION_UNAVAILABLE` / `SIM_ENGINE_PARAMETERS_REQUIRED` failures retained |
| `layers/simulation` + `packages/handoff-contracts` `package.json` | vitest ^1.6.0 devDependency (test scripts already declared `vitest run`) |
| `infinicus-platform/docs/architecture-manifest.md` / `layers/simulation/README.md` | Integration documentation (see Docs section) |

## Characterization Evidence

Verified against the REAL engine (extracted, not re-implemented):

- `sampleSize` = 500 and `horizonDays` = 90 on every run — engine constants
  (`monteCarlo` loop, `SIM_DAYS`), not facade inputs
- Percentiles monotonic (p10 ≤ p25 ≤ p50 ≤ p75 ≤ p90), survival rate ∈ [0,1],
  currency metadata `USD` un-converted
- `randomSeed: null` — Engine v3 uses `Math.random`; seeding is NOT
  supported, recorded as a limitation
  (`engine_v3_does_not_support_seeded_reproducibility`), never fabricated
- Adapter spies prove the same operation is called with unaltered values;
  numeric outputs pass through exactly (`-812.5 … 7104.125` fixtures)
- Engine failures surface as typed errors — no fake successful runs

## Validation Results

| Gate | Command | Result |
|---|---|---|
| Contract + runtime validation | `pnpm --filter @infinicus/handoff-contracts test` | 14/14 pass |
| Ports, adapter, mapper, rejections | `pnpm --filter @infinicus/layer-simulation test` | 26/26 pass |
| ADI-06 + ADI-16 integration, characterization, idempotency, cross-tenant, missing-engine | root `.mjs` tests | 2/2 pass |
| Bundle syntax | `node --check ai-decision-intelligence/adi-bundle.js` | clean |
| Root regression (ADI + ABA + BI + DT + OM + CL) | per-layer `node tests/*.mjs` | 154/154 pass |
| Monorepo ADI source regression | `node --test blocks/*/tests/*.test.mjs` | 106/106 pass |
| Database regression (live PostgreSQL 16) | `pnpm --filter @infinicus/database test` | 456/456 pass |
| Lint | `pnpm lint` | 21/21 tasks |
| Typecheck | `pnpm typecheck` | clean |
| Build | `pnpm build` | 21/21 tasks |

Confirmed: **no migration added, no database schema added, Monte Carlo
mathematics untouched (0 deleted lines in index.html), no recommendation or
approval authority in SIM, BUILD-08 not implemented.**

Note: the database test re-run required re-provisioning the local test
database (container snapshot reset — environmental, unrelated to BUILD-07).

## Queue Transition

- BUILD-07: ready → in_progress → **completed**
- BUILD-08 (DAL): remains **pending** — it has NO authoritative
  specification in the manifest, so it was NOT marked ready merely to
  advance the queue. Authoring `BUILD-08` scope is the next queue action.
