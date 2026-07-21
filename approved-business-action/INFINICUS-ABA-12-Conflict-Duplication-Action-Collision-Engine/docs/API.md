# API

`window.INFINICUS.ABA.actionCollisionEngine`

- `registerActiveAction(input)`
- `analyze({ conflictAnalysisHandoffId, allocations, operations })`
- `resolveConflict({ actionConflictId, resolution, resolvedBy })`
- `getCollisionAnalysis({ collisionAnalysisId })`
- `getActionDecompositionHandoff({ actionDecompositionHandoffId })`
- `listConflicts()`

Routes:
- `aba.active_action.register`
- `aba.action_collision.analyze`
- `aba.action_collision.resolve`
