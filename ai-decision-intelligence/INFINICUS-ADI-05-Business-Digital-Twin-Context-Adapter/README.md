# INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter

Business Digital Twin Context Adapter — block ADI-05 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-05-business-digital-twin-context-adapter.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-05"]
```

Key exports: `createDigitalTwinContextAdapter`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.digital_twin_context_adapter`.

## Routes

- `adi.digital_twin_context.acquire`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-04 (`adi.decision_context`)

## Tests

```bash
node tests/adi-05-business-digital-twin-context-adapter.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-05-Business-Digital-Twin-Context-Adapter/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
