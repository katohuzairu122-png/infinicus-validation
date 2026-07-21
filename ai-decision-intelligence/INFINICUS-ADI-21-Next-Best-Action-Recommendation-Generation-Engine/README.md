# INFINICUS-ADI-21-Next-Best-Action-Recommendation-Generation-Engine

Next Best Action Recommendation Generation Engine — block ADI-21 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-21-next-best-action-recommendation-generation-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-21"]
```

Key exports: `createRecommendationEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.recommendation_generation`.

## Routes

- `adi.recommendation.propose`
- `adi.recommendation.get`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-17 (`adi.risk_assessment`)
- ADI-18 (`adi.scoring_ranking`)
- ADI-19 (`adi.confidence_calibration`)
- ADI-20 (`adi.explainability`)

## Tests

```bash
node tests/adi-21-next-best-action-recommendation-generation-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-21-Next-Best-Action-Recommendation-Generation-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
