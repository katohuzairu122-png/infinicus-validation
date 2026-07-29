# API

`window.INFINICUS.ABA.expectedOutcomeMonitoringContractEngine`

- `registerMetric(input)`
- `registerEvidenceSource(input)`
- `registerOutcome(input)`
- `createMonitoringContract({ outcomeMonitoringHandoffId, expectedOutcomeDefinitionIds })`
- `getMonitoringContract({ outcomeMonitoringContractId })`
- `getOutcomePublicationHandoff({ outcomePublicationHandoffId })`
- `listOutcomeDefinitions()`

Routes:
- `aba.outcome_metric.register`
- `aba.outcome_evidence_source.register`
- `aba.expected_outcome.register`
- `aba.outcome_monitoring_contract.create`
