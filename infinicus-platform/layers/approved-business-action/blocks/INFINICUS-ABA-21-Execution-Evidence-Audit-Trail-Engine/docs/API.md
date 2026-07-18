# API

`window.INFINICUS.ABA.executionEvidenceAuditEngine`

- `buildEvidencePackage({ executionEvidenceHandoffId, executionContext })`
- `verifyEvidence({ executionEvidenceId })`
- `revokePackage({ executionEvidencePackageId, revokedBy, reason })`
- `getEvidencePackage({ executionEvidencePackageId })`
- `getCompletionVerificationHandoff({ completionVerificationHandoffId })`
- `listAuditEvents()`

Routes:
- `aba.execution_evidence.build`
- `aba.execution_evidence.verify`
- `aba.execution_evidence.revoke`
