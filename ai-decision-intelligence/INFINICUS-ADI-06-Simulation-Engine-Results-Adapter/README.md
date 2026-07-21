# INFINICUS-ADI-06-Simulation-Engine-Results-Adapter

Simulation Engine Results Adapter — block ADI-06 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-06-simulation-engine-results-adapter.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-06"]
```

Key exports: `createSimulationResultsAdapter`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.simulation_results_adapter`.

## Routes

- `adi.simulation_results.acquire`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-04 (`adi.decision_context`)

## Tests

```bash
node tests/adi-06-simulation-engine-results-adapter.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-06-Simulation-Engine-Results-Adapter/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
