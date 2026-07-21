(function(global){
  "use strict";
  function validateHandoff(handoff){
    const issues=[];
    if(!handoff.approvalWorkflowId) issues.push("Approval workflow ID is required.");
    if(!handoff.actionInstanceId) issues.push("Action instance ID is required.");
    if(!["approved","approved_with_conditions","rejected"].includes(handoff.workflowOutcome)){
      issues.push("Workflow outcome is unsupported.");
    }
    if(!Array.isArray(handoff.tasks) || !handoff.tasks.length){
      issues.push("Approval tasks are required.");
    }
    for(const task of handoff.tasks||[]){
      if(!task.approverActorId || !task.approverRoleId){
        issues.push("Approver identity evidence is incomplete.");
      }
      if(!["approved","approved_with_conditions","rejected"].includes(task.decision)){
        issues.push(`Task decision is invalid: ${task.approvalTaskId}`);
      }
      if(!task.respondedAt){
        issues.push(`Task response timestamp is missing: ${task.approvalTaskId}`);
      }
    }
    return {valid:issues.length===0,issues};
  }

  function verify(record,expectedChecksum,checksum){
    const calculated=checksum.hash(record);
    return {
      valid:calculated===expectedChecksum,
      expectedChecksum,
      calculatedChecksum:calculated
    };
  }

  global.INFINICUS.ABA.approvalEvidenceValidator=
    Object.freeze({validateHandoff,verify});
})(window);
