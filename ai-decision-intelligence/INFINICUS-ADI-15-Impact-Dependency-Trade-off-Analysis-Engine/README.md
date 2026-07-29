# INFINICUS-ADI-15-Impact-Dependency-Trade-off-Analysis-Engine

Impact Dependency Trade off Analysis Engine — block ADI-15 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-15-impact-dependency-trade-off-analysis-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-15"]
```

Key exports: `createImpactAnalysisEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.impact_analysis`.

## Routes

- `adi.impacts.analyse`
- `adi.impacts.get`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-13 (`adi.alternative_generation`)
- ADI-14 (`adi.feasibility_filter`)

## Tests

```bash
node tests/adi-15-impact-dependency-trade-off-analysis-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-15-Impact-Dependency-Trade-off-Analysis-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
