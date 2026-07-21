# INFINICUS-ADI-23-Decision-Gate-Escalation-Human-Review-Engine

Decision Gate Escalation Human Review Engine — block ADI-23 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-23-decision-gate-escalation-human-review-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-23"]
```

Key exports: `createDecisionGateEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.decision_gate`.

## Routes

- `adi.gate.submit`
- `adi.gate.review`
- `adi.gate.get`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-21 (`adi.recommendation_generation`)
- ADI-22 (`adi.red_team_validation`)

## Tests

```bash
node tests/adi-23-decision-gate-escalation-human-review-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-23-Decision-Gate-Escalation-Human-Review-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
