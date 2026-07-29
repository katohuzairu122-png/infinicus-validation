(function(global){
  "use strict";
  function create({workflow, stageNumber, roleIds, mode, requiredCount}){
    const runtime = global.INFINICUS.ABA.runtime;
    return runtime.success({
      approvalStageId: runtime.createId("aba_approval_stage"),
      approvalWorkflowId: workflow.approvalWorkflowId,
      stageNumber: Number(stageNumber),
      roleIds: runtime.clone(roleIds || []),
      mode: String(mode || workflow.workflowMode),
      requiredCount: Math.max(1, Number(requiredCount || workflow.requiredApprovalCount || 1)),
      state: "pending",
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString()
    });
  }
  global.INFINICUS.ABA.approvalStageModel = Object.freeze({create});
})(window);
