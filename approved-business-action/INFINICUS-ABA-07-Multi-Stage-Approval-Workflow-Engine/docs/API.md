# API

`window.INFINICUS.ABA.multiStageApprovalWorkflowEngine`

- `createWorkflow({ approvalWorkflowHandoffId, stages, approvers })`
- `respond({ approvalTaskId, decision, conditions, comment })`
- `escalate({ approvalWorkflowId, reason })`
- `getWorkflow({ approvalWorkflowId })`
- `getApprovalEvidenceHandoff({ approvalEvidenceHandoffId })`
- `listWorkflowTasks({ approvalWorkflowId })`

Routes:
- `aba.approval_workflow.create`
- `aba.approval_task.respond`
- `aba.approval_workflow.escalate`
