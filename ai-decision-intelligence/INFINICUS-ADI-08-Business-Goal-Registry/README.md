# INFINICUS-ADI-08-Business-Goal-Registry

Business Goal Registry — block ADI-08 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-08-business-goal-registry.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-08"]
```

Key exports: `createGoalRegistry`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.goal_registry`.

## Routes

- `adi.goal.create`
- `adi.goal.get`
- `adi.goal.list`
- `adi.goal.history`
- `adi.goal.update`
- `adi.goal.status.update`
- `adi.goal.legacy.import`
- `adi.goal.legacy.export`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-04 (`adi.decision_context`)

## Tests

```bash
node tests/adi-08-business-goal-registry.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-08-Business-Goal-Registry/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
