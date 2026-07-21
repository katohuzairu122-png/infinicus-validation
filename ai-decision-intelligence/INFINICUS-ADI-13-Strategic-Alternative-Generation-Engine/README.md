# INFINICUS-ADI-13-Strategic-Alternative-Generation-Engine

Strategic Alternative Generation Engine — block ADI-13 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-13-strategic-alternative-generation-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-13"]
```

Key exports: `createAlternativeGenerationEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.alternative_generation`.

## Routes

- `adi.alternatives.generate`
- `adi.alternatives.get`
- `adi.alternatives.list`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-12 (`adi.evaluation_framework`)

## Tests

```bash
node tests/adi-13-strategic-alternative-generation-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-13-Strategic-Alternative-Generation-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
