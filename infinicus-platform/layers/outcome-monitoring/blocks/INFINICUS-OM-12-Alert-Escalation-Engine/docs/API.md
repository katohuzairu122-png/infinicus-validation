# API

`window.INFINICUS.OM.alertEscalationEngine`

- `registerPolicy(input)`
- `createAlerts({ alertEscalationHandoffId, alertEscalationPolicyId })`
- `acknowledge({ outcomeAlertId, acknowledgedBy, note })`
- `escalate({ outcomeAlertId, reason })`
- `resolve({ outcomeAlertId, resolvedBy, resolutionEvidence })`
- `getAlert({ outcomeAlertId })`
- `getAttributionEvidenceHandoff({ attributionEvidenceHandoffId })`
- `listAlerts()`

Routes:
- `om.alert_escalation_policy.register`
- `om.alerts.create`
- `om.alert.acknowledge`
- `om.alert.escalate`
- `om.alert.resolve`
