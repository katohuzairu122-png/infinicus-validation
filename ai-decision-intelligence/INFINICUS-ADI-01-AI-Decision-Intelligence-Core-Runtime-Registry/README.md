# INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry

AI Decision Intelligence Core Runtime Registry — block ADI-01 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-01-ai-decision-intelligence-core-runtime-registry.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-01"]
```

Key exports: `createADIRuntime`, `installGlobal`.

## Service

Registered on the ADI-01 runtime as `adi.core_runtime`.

## Routes

- `adi.runtime.diagnose`
- `adi.runtime.manifest`

## Dependencies

- none (foundational block)

## Tests

```bash
node tests/adi-01-ai-decision-intelligence-core-runtime-registry.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
