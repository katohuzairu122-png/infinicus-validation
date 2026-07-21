(function(global){
  "use strict";
  function create({handoff,task,signature}){
    const runtime=global.INFINICUS.ABA.runtime;
    return runtime.success({
      approvalEvidenceId:runtime.createId("aba_approval_evidence"),
      approvalWorkflowId:handoff.approvalWorkflowId,
      actionInstanceId:handoff.actionInstanceId,
      approvalTaskId:task.approvalTaskId,
      approverActorId:task.approverActorId,
      approverRoleId:task.approverRoleId,
      delegatedFromActorId:task.delegatedFromActorId,
      decision:task.decision,
      conditions:runtime.clone(task.conditions||[]),
      comment:task.comment||null,
      respondedAt:task.respondedAt,
      signature:runtime.clone(signature||{
        signatureType:"recorded_approval",
        signerId:task.approverActorId,
        signedAt:task.respondedAt
      }),
      correlationId:handoff.correlationId,
      status:"recorded",
      createdAt:new Date().toISOString()
    });
  }
  global.INFINICUS.ABA.approvalEvidenceModel=Object.freeze({create});
})(window);
