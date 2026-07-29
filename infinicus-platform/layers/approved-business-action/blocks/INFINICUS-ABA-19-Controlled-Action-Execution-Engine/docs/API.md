# API

`window.INFINICUS.ABA.controlledActionExecutionEngine`

- `registerPolicy(input)`
- `registerExecutor(adapterCode, executor)`
- `execute({ controlledExecutionHandoffId, controlledExecutionPolicyId, queueItems })`
- `getExecutionResult({ controlledExecutionResultId })`
- `getExecutionFailureHandoff({ executionFailureHandoffId })`
- `listAttempts()`

Routes:
- `aba.controlled_execution_policy.register`
- `aba.controlled_execution.execute`
