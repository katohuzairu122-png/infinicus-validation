# API

`window.INFINICUS.ABA.executionFailureRollbackEngine`

- `registerPolicy(input)`
- `registerRollbackExecutor(code, executor)`
- `handleFailure({ executionFailureHandoffId, executionFailurePolicyId, rollbackSteps })`
- `getFailureCase({ executionFailureCaseId })`
- `getExecutionEvidenceHandoff({ executionEvidenceHandoffId })`
- `listRollbackAttempts()`

Routes:
- `aba.execution_failure_policy.register`
- `aba.execution_failure.handle`
