# INFINICUS-ADI-18-Multi-Criteria-Decision-Scoring-Ranking-Engine

Multi Criteria Decision Scoring Ranking Engine — block ADI-18 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-18-multi-criteria-decision-scoring-ranking-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-18"]
```

Key exports: `createScoringEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.scoring_ranking`.

## Routes

- `adi.ranking.score`
- `adi.ranking.get`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-12 (`adi.evaluation_framework`)
- ADI-13 (`adi.alternative_generation`)
- ADI-14 (`adi.feasibility_filter`)
- ADI-17 (`adi.risk_assessment`)

## Tests

```bash
node tests/adi-18-multi-criteria-decision-scoring-ranking-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-18-Multi-Criteria-Decision-Scoring-Ranking-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
