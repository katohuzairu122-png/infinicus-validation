# INFINICUS-ADI-10-Business-Problem-Definition-Engine

Business Problem Definition Engine — block ADI-10 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-10-business-problem-definition-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-10"]
```

Key exports: `createProblemDefinitionEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.problem_definition`.

## Routes

- `adi.problem.create`
- `adi.problem.get`
- `adi.problem.list`
- `adi.problem.history`
- `adi.problem.update`
- `adi.problem.status.update`
- `adi.problem.legacy.import`
- `adi.problem.legacy.export`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-04 (`adi.decision_context`)
- ADI-07 (`adi.evidence_registry`)
- ADI-08 (`adi.goal_registry`)
- ADI-09 (`adi.trigger_registry`)

## Tests

```bash
node tests/adi-10-business-problem-definition-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-10-Business-Problem-Definition-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
