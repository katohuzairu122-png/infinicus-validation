# INFINICUS-ADI-22-Recommendation-Challenge-Red-Team-Validation-Engine

Recommendation Challenge Red Team Validation Engine — block ADI-22 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-22-recommendation-challenge-red-team-validation-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-22"]
```

Key exports: `createRedTeamEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.red_team_validation`.

## Routes

- `adi.redteam.challenge`
- `adi.redteam.get`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-18 (`adi.scoring_ranking`)
- ADI-20 (`adi.explainability`)
- ADI-21 (`adi.recommendation_generation`)

## Tests

```bash
node tests/adi-22-recommendation-challenge-red-team-validation-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-22-Recommendation-Challenge-Red-Team-Validation-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
