# INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine

Decision Context Evidence Assembly Engine — block ADI-11 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-11-decision-context-evidence-assembly-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-11"]
```

Key exports: `createAssemblyEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.context_evidence_assembly`.

## Routes

- `adi.analysis_case.assemble`
- `adi.analysis_case.get`
- `adi.analysis_case.list`
- `adi.analysis_case.history`
- `adi.analysis_case.verify`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-07 (`adi.evidence_registry`)
- ADI-08 (`adi.goal_registry`)
- ADI-09 (`adi.trigger_registry`)
- ADI-10 (`adi.problem_definition`)

## Tests

```bash
node tests/adi-11-decision-context-evidence-assembly-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-11-Decision-Context-Evidence-Assembly-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
