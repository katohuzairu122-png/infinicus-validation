# API

`window.INFINICUS.OM.masterIntegrationEngine`

- `registerDeploymentAdapter(adapterType, adapter)`
- `diagnose(config)`
- `assemble({ outcomeMonitoringAssemblyHandoffId, environment, releaseVersion })`
- `deploy({ outcomeMonitoringDeploymentManifestId, adapterType, deploymentConfig })`
- `recordRollback({ outcomeMonitoringDeploymentId, reason, rollbackVersion })`
- `getAssembly({ outcomeMonitoringAssemblyId })`
- `getDeployment({ outcomeMonitoringDeploymentId })`
- `listDeployments()`
- `manifest`

Routes:
- `om.master.diagnose`
- `om.master.assemble`
- `om.master.deploy`
- `om.master.rollback.record`
