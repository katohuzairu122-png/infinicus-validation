# API

`window.INFINICUS.ABA.masterIntegrationEngine`

## Methods

- `diagnose({ config })`
- `assessDeploymentReadiness({ config })`
- `runPipeline({ pipelineName, correlationId, context, handlers })`
- `validateTerminalHandoffs({ terminalResult })`
- `createDeploymentManifest({ config, artifactVersion, commitReference })`
- `getBlockManifest()`
- `listDiagnostics()`
- `listPipelineRuns()`

## Routes

- `aba.master.diagnose`
- `aba.master.readiness`
- `aba.master.pipeline.run`
- `aba.master.terminal_handoffs.validate`
- `aba.master.deployment_manifest.create`
