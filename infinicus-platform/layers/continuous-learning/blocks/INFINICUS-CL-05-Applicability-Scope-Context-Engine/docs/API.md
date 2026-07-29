# API

`window.INFINICUS.CL.applicabilityScopeContextEngine`

- `registerPolicy(input)`
- `registerContext(input)`
- `assess({ applicabilityScopeHandoffId, applicabilityPolicyId, sourceContextId, targetContextIds })`
- `getAssessment({ applicabilityAssessmentId })`
- `getLearningConfidenceHandoff({ learningConfidenceHandoffId })`
- `listAssessments()`
- `listRestrictions()`

Routes:

- `cl.applicability_policy.register`
- `cl.context_profile.register`
- `cl.applicability.assess`
