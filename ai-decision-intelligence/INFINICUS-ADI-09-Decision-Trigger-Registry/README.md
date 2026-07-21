# INFINICUS-ADI-09-Decision-Trigger-Registry

Decision Trigger Registry — block ADI-09 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-09-decision-trigger-registry.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-09"]
```

Key exports: `createTriggerRegistry`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.trigger_registry`.

## Routes

- `adi.trigger.create`
- `adi.trigger.get`
- `adi.trigger.list`
- `adi.trigger.history`
- `adi.trigger.update`
- `adi.trigger.status.update`
- `adi.trigger.legacy.import`
- `adi.trigger.legacy.export`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-04 (`adi.decision_context`)
- ADI-08 (`adi.goal_registry`)

## Tests

```bash
node tests/adi-09-decision-trigger-registry.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-09-Decision-Trigger-Registry/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
