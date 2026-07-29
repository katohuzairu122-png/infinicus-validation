# API

`window.INFINICUS.OM.monitoringExceptionMissingDataEngine`

- `registerPolicy(input)`
- `detect({ monitoringExceptionHandoffId, monitoringExceptionPolicyId, monitoringContext })`
- `waive({ monitoringExceptionId, waivedBy, reason, expiresAt })`
- `resolve({ monitoringExceptionId, resolvedBy, resolutionEvidence })`
- `getException({ monitoringExceptionId })`
- `getOutcomeAuditHandoff({ outcomeAuditHandoffId })`
- `listExceptions()`

Routes:
- `om.monitoring_exception_policy.register`
- `om.monitoring_exceptions.detect`
- `om.monitoring_exception.waive`
- `om.monitoring_exception.resolve`
