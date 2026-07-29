# API

`window.INFINICUS.OM.adverseOutcomeSideEffectEngine`

- `registerPolicy(input)`
- `registerAdverseMetric(input)`
- `detect({ adverseOutcomeHandoffId, adverseOutcomePolicyId, adverseEvidenceByMetric })`
- `getDetection({ adverseOutcomeDetectionId })`
- `getMonitoringExceptionHandoff({ monitoringExceptionHandoffId })`
- `listDetections()`

Routes:
- `om.adverse_outcome_policy.register`
- `om.adverse_metric.register`
- `om.adverse_outcomes.detect`
