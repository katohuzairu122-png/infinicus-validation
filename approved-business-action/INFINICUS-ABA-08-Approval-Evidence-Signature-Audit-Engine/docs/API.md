# API

`window.INFINICUS.ABA.approvalEvidenceAuditEngine`

- `recordEvidence({ approvalEvidenceHandoffId, signatures })`
- `verifyEvidence({ approvalEvidenceId })`
- `revokeEvidence({ approvalEvidencePackageId, revokedBy, reason })`
- `getEvidencePackage({ approvalEvidencePackageId })`
- `getActionContractHandoff({ actionContractHandoffId })`
- `listAuditEvents()`

Routes:
- `aba.approval_evidence.record`
- `aba.approval_evidence.verify`
- `aba.approval_evidence.revoke`
