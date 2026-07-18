# API

`window.INFINICUS.BI.masterIntegrationEngine`

- `diagnose({ config })`
- `assessDeploymentReadiness({ config })`
- `runPipeline({ context, handlers, correlationId })`
- `validateTwinHandoff({ publicationResult })`
- `createDeploymentManifest({...})`
- `getBlockManifest()`
- `listDiagnostics()`
- `listPipelineRuns()`

Routes:
- `bi.master.diagnose`
- `bi.master.readiness`
- `bi.master.pipeline.run`
- `bi.master.twin_handoff.validate`
- `bi.master.deployment_manifest.create`
