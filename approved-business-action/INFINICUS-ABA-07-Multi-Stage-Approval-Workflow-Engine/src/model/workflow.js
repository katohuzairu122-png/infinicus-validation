(function(global){
  "use strict";
  function create(handoff, input={}){
    const runtime = global.INFINICUS.ABA.runtime;
    const now = new Date();
    const deadline = new Date(
      now.getTime() + Number(handoff.approvalDeadlineHours || 24) * 3600000
    ).toISOString();

    return runtime.success({
      approvalWorkflowId: input.approvalWorkflowId || runtime.createId("aba_approval_workflow"),
      approvalWorkflowHandoffId: handoff.approvalWorkflowHandoffId,
      actionInstanceId: handoff.actionInstanceId,
      businessId: handoff.businessId,
      workflowMode: handoff.workflowMode,
      requiredApprovalCount: handoff.requiredApprovalCount,
      requiredApproverRoles: runtime.clone(handoff.requiredApproverRoles),
      unanimous: Boolean(handoff.unanimous),
      allowConditionalApproval: Boolean(handoff.allowConditionalApproval),
      escalationRoleIds: runtime.clone(handoff.escalationRoleIds),
      deadlineAt: input.deadlineAt || deadline,
      currentStage: 1,
      state: "active",
      version: 1,
      correlationId: handoff.correlationId,
      causationId: handoff.causationId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });
  }
  global.INFINICUS.ABA.approvalWorkflowModel = Object.freeze({create});
})(window);
