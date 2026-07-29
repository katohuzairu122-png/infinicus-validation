# INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine

Decision Request Intake Validation Engine — block ADI-02 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-02-decision-request-intake-validation-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-02"]
```

Key exports: `createDecisionRequestIntakeEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.decision_request_intake`.

## Routes

- `adi.decision_request.submit`

## Dependencies

- ADI-01 (`adi.core_runtime`)

## Tests

```bash
node tests/adi-02-decision-request-intake-validation-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
