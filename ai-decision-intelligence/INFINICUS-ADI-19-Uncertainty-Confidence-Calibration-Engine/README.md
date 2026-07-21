# INFINICUS-ADI-19-Uncertainty-Confidence-Calibration-Engine

Uncertainty Confidence Calibration Engine — block ADI-19 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-19-uncertainty-confidence-calibration-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-19"]
```

Key exports: `createConfidenceCalibrationEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.confidence_calibration`.

## Routes

- `adi.confidence.assess`
- `adi.confidence.get`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-16 (`adi.simulation_orchestration`)
- ADI-17 (`adi.risk_assessment`)
- ADI-18 (`adi.scoring_ranking`)

## Tests

```bash
node tests/adi-19-uncertainty-confidence-calibration-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-19-Uncertainty-Confidence-Calibration-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
