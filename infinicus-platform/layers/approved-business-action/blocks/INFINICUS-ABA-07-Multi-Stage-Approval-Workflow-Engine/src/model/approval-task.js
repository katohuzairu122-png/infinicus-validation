(function(global){
  "use strict";
  function create({workflow, stage, approver}){
    const runtime = global.INFINICUS.ABA.runtime;
    if(!approver?.actorId || !approver?.roleId){
      return runtime.failure("ABA_APPROVER_INVALID","approver actorId and roleId are required.");
    }
    return runtime.success({
      approvalTaskId: runtime.createId("aba_approval_task"),
      approvalWorkflowId: workflow.approvalWorkflowId,
      approvalStageId: stage.approvalStageId,
      actionInstanceId: workflow.actionInstanceId,
      approverActorId: String(approver.actorId),
      approverRoleId: String(approver.roleId),
      delegatedFromActorId: approver.delegatedFromActorId || null,
      state: "pending",
      decision: null,
      conditions: [],
      comment: null,
      respondedAt: null,
      createdAt: new Date().toISOString()
    });
  }
  global.INFINICUS.ABA.approvalTaskModel = Object.freeze({create});
})(window);
