# API

`window.INFINICUS.OM.benefitRealizationEngine`

- `registerPolicy(input)`
- `registerBenefitDefinition(input)`
- `assess({ benefitRealizationHandoffId, benefitRealizationPolicyId, realizedBenefitByMetric })`
- `getAssessment({ benefitRealizationAssessmentId })`
- `getAdverseOutcomeHandoff({ adverseOutcomeHandoffId })`
- `listAssessments()`

Routes:
- `om.benefit_realization_policy.register`
- `om.benefit_definition.register`
- `om.benefit_realization.assess`
