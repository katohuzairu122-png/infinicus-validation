# INFINICUS-ADI-24-Approved-Business-Action-Package-Publication-Handoff

Approved Business Action Package Publication Handoff — block ADI-24 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-24-approved-business-action-package-publication-handoff.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-24"]
```

Key exports: `createABAHandoffEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.aba_handoff`.

## Routes

- `adi.handoff.build`
- `adi.handoff.publish`
- `adi.handoff.get`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-20 (`adi.explainability`)
- ADI-21 (`adi.recommendation_generation`)
- ADI-23 (`adi.decision_gate`)

## Tests

```bash
node tests/adi-24-approved-business-action-package-publication-handoff.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-24-Approved-Business-Action-Package-Publication-Handoff/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
