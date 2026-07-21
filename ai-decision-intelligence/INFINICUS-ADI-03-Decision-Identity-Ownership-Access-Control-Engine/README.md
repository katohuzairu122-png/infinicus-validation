# INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine

Decision Identity Ownership Access Control Engine — block ADI-03 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-03-decision-identity-ownership-access-control-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-03"]
```

Key exports: `createAccessControlEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.access_control`.

## Routes

- `adi.access.authorize`
- `adi.decision_case.secure`

## Dependencies

- ADI-01 (`adi.core_runtime`)

## Tests

```bash
node tests/adi-03-decision-identity-ownership-access-control-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-03-Decision-Identity-Ownership-Access-Control-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
