# API

`window.INFINICUS.OM.observationSourceConnectorRegistryEngine`

- `registerSource(input)`
- `registerConnector(input)`
- `bindFromHandoff({ observationSourceHandoffId, sourceMappings })`
- `updateHealth({ recordType, recordId, healthStatus })`
- `getSource({ observationSourceId })`
- `getConnector({ observationConnectorId })`
- `getObservationCollectionHandoff({ observationCollectionHandoffId })`
- `listBindings()`

Routes:
- `om.observation_source.register`
- `om.observation_connector.register`
- `om.observation_sources.bind_from_handoff`
- `om.observation_source_health.update`
