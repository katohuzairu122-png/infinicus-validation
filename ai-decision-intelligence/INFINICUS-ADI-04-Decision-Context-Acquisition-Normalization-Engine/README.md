# INFINICUS-ADI-04-Decision-Context-Acquisition-Normalization-Engine

Decision Context Acquisition Normalization Engine — block ADI-04 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-04-decision-context-acquisition-normalization-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-04"]
```

Key exports: `createDecisionContextEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.decision_context`.

## Routes

- `adi.decision_context.acquire`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-03 (`adi.access_control`)

## Tests

```bash
node tests/adi-04-decision-context-acquisition-normalization-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-04-Decision-Context-Acquisition-Normalization-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
