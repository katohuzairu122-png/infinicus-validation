# API

`window.INFINICUS.ABA.preExecutionDryRunEngine`

- `registerPolicy(input)`
- `registerMockRunner(adapterCode, runner)`
- `runDryRun({ dryRunHandoffId, dryRunPolicyId })`
- `getDryRun({ dryRunId })`
- `getControlledExecutionHandoff({ controlledExecutionHandoffId })`
- `listFailures()`

Routes:
- `aba.dry_run_policy.register`
- `aba.dry_run.execute`
