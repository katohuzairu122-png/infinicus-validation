# INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine

Decision Objectives Constraints Criteria Engine — block ADI-12 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-12-decision-objectives-constraints-criteria-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-12"]
```

Key exports: `createFrameworkEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.evaluation_framework`.

## Routes

- `adi.evaluation_framework.create`
- `adi.evaluation_framework.from_problem`
- `adi.evaluation_framework.get`
- `adi.evaluation_framework.list`
- `adi.evaluation_framework.history`
- `adi.evaluation_framework.update`
- `adi.evaluation_framework.validate`
- `adi.evaluation_framework.lock`
- `adi.evaluation_framework.supersede`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-10 (`adi.problem_definition`)
- ADI-11 (`adi.context_evidence_assembly`)

## Tests

```bash
node tests/adi-12-decision-objectives-constraints-criteria-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-12-Decision-Objectives-Constraints-Criteria-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
