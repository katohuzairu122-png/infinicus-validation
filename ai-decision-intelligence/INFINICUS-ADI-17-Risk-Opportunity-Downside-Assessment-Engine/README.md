# INFINICUS-ADI-17-Risk-Opportunity-Downside-Assessment-Engine

Risk Opportunity Downside Assessment Engine — block ADI-17 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-17-risk-opportunity-downside-assessment-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-17"]
```

Key exports: `createRiskAssessmentEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.risk_assessment`.

## Routes

- `adi.risk.assess`
- `adi.risk.get`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-15 (`adi.impact_analysis`)
- ADI-16 (`adi.simulation_orchestration`)

## Tests

```bash
node tests/adi-17-risk-opportunity-downside-assessment-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-17-Risk-Opportunity-Downside-Assessment-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
