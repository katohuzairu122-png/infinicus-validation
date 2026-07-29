# API

`window.INFINICUS.ABA.outcomeMonitoringPublicationEngine`

- `registerPolicy(input)`
- `registerDestination(input)`
- `registerPublisher(destinationType, publisher)`
- `publish({ outcomePublicationHandoffId, outcomePublicationPolicyId, monitoringDestinationId })`
- `getPublication({ outcomePublicationId })`
- `getOutcomeMonitoringLayerHandoff({ outcomeMonitoringLayerHandoffId })`
- `getContinuousLearningHandoff({ continuousLearningHandoffId })`
- `listDeadLetters()`

Routes:
- `aba.outcome_publication_policy.register`
- `aba.monitoring_destination.register`
- `aba.outcome_monitoring.publish`
