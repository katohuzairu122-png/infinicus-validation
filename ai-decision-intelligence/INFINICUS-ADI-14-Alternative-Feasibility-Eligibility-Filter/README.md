# INFINICUS-ADI-14-Alternative-Feasibility-Eligibility-Filter

Alternative Feasibility Eligibility Filter — block ADI-14 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-14-alternative-feasibility-eligibility-filter.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-14"]
```

Key exports: `createFeasibilityFilter`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.feasibility_filter`.

## Routes

- `adi.feasibility.evaluate`
- `adi.feasibility.get`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-12 (`adi.evaluation_framework`)
- ADI-13 (`adi.alternative_generation`)

## Tests

```bash
node tests/adi-14-alternative-feasibility-eligibility-filter.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-14-Alternative-Feasibility-Eligibility-Filter/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
