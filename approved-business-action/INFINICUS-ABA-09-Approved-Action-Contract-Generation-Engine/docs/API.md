# API

`window.INFINICUS.ABA.approvedActionContractEngine`

- `registerTemplate(input)`
- `generateContract({ actionContractHandoffId, actionContractTemplateId, actionContext, validityHours })`
- `verifyContract({ actionContractId })`
- `revokeContract({ actionContractId, revokedBy, reason })`
- `getActionContract({ actionContractId })`
- `getActionBoundaryHandoff({ actionBoundaryHandoffId })`
- `listContracts()`

Routes:
- `aba.action_contract_template.register`
- `aba.action_contract.generate`
- `aba.action_contract.verify`
- `aba.action_contract.revoke`
