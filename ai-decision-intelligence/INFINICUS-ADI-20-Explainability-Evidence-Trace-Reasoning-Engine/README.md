# INFINICUS-ADI-20-Explainability-Evidence-Trace-Reasoning-Engine

Explainability Evidence Trace Reasoning Engine — block ADI-20 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-20-explainability-evidence-trace-reasoning-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-20"]
```

Key exports: `createExplainabilityEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.explainability`.

## Routes

- `adi.explanation.create`
- `adi.explanation.get`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-17 (`adi.risk_assessment`)
- ADI-18 (`adi.scoring_ranking`)
- ADI-19 (`adi.confidence_calibration`)

## Tests

```bash
node tests/adi-20-explainability-evidence-trace-reasoning-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-20-Explainability-Evidence-Trace-Reasoning-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
