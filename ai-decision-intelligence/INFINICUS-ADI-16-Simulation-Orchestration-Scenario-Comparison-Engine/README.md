# INFINICUS-ADI-16-Simulation-Orchestration-Scenario-Comparison-Engine

Simulation Orchestration Scenario Comparison Engine — block ADI-16 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-16-simulation-orchestration-scenario-comparison-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-16"]
```

Key exports: `createSimulationOrchestrator`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.simulation_orchestration`.

## Routes

- `adi.scenarios.orchestrate`
- `adi.scenarios.get`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-13 (`adi.alternative_generation`)
- ADI-14 (`adi.feasibility_filter`)
- ADI-15 (`adi.impact_analysis`)

## Tests

```bash
node tests/adi-16-simulation-orchestration-scenario-comparison-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-16-Simulation-Orchestration-Scenario-Comparison-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
