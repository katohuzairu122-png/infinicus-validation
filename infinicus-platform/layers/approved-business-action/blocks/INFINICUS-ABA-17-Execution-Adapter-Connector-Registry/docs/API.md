# API

`window.INFINICUS.ABA.executionAdapterConnectorRegistry`

- `registerAdapter(input)`
- `registerConnector(input)`
- `recordHealth(input)`
- `prepareAdapters({ executionAdapterHandoffId, taskCatalog, region, environment })`
- `getAdapter({ executionAdapterId })`
- `getDryRunHandoff({ dryRunHandoffId })`
- `listConnectors()`

Routes:
- `aba.execution_adapter.register`
- `aba.connector.register`
- `aba.execution_adapter.health`
- `aba.execution_adapters.prepare`
