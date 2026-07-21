# API

`window.INFINICUS.OM.attributionEvidenceEngine`

- `registerPolicy(input)`
- `registerCounterfactual(input)`
- `assessAttribution({ attributionEvidenceHandoffId, attributionPolicyId, evidenceByMetric })`
- `getAssessment({ attributionAssessmentId })`
- `getCausationAssessmentHandoff({ causationAssessmentHandoffId })`
- `listAssessments()`

Routes:
- `om.attribution_policy.register`
- `om.counterfactual.register`
- `om.attribution.assess`
