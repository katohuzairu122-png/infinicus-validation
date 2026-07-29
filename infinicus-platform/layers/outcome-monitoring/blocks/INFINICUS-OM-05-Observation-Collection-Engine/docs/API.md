# API

`window.INFINICUS.OM.observationCollectionEngine`

- `registerPolicy(input)`
- `registerCollector(connectorType, collector)`
- `collect({ observationCollectionHandoffId, observationCollectionPolicyId })`
- `getCollectionRun({ observationCollectionRunId })`
- `getObservationQualityHandoff({ observationQualityHandoffId })`
- `listObservations()`
- `listDeadLetters()`

Routes:
- `om.observation_collection_policy.register`
- `om.observations.collect`
