# API

`window.INFINICUS.OM.outcomeEvaluationVerdictEngine`

- `registerPolicy(input)`
- `evaluate({ outcomeVerdictHandoffId, outcomeVerdictPolicyId })`
- `review({ outcomeVerdictId, reviewedBy, decision, note })`
- `getVerdict({ outcomeVerdictId })`
- `getLearningPackageHandoff({ learningPackageHandoffId })`
- `listVerdicts()`

Routes:
- `om.outcome_verdict_policy.register`
- `om.outcome_verdict.evaluate`
- `om.outcome_verdict.review`
