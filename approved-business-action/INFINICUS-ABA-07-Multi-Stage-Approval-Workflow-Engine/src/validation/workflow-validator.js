(function(global){
  "use strict";

  function validateApprovers(handoff, approvers){
    const issues = [];
    const allowed = new Set(handoff.requiredApproverRoles || []);
    const seen = new Set();

    for(const approver of approvers){
      if(!approver.actorId || !approver.roleId){
        issues.push("Approver actorId and roleId are required.");
        continue;
      }
      if(allowed.size && !allowed.has(approver.roleId)){
        issues.push(`Approver role is not required: ${approver.roleId}`);
      }
      const key = `${approver.actorId}|${approver.roleId}`;
      if(seen.has(key)) issues.push(`Duplicate approver: ${key}`);
      seen.add(key);
    }

    if(approvers.length < Number(handoff.requiredApprovalCount || 1)){
      issues.push("Not enough approvers were assigned.");
    }

    return {valid: issues.length===0, issues};
  }

  function evaluateStage({tasks, mode, requiredCount, unanimous}){
    const approved = tasks.filter(t=>t.decision==="approved").length;
    const conditional = tasks.filter(t=>t.decision==="approved_with_conditions").length;
    const rejected = tasks.filter(t=>t.decision==="rejected").length;
    const responded = tasks.filter(t=>t.state==="responded").length;
    const positive = approved + conditional;

    if(unanimous && rejected>0) return {complete:true, outcome:"rejected"};
    if(unanimous && responded===tasks.length && positive===tasks.length){
      return {complete:true, outcome:conditional>0?"approved_with_conditions":"approved"};
    }
    if(mode==="majority" && positive > tasks.length/2){
      return {complete:true, outcome:conditional>0?"approved_with_conditions":"approved"};
    }
    if(mode==="parallel" && positive>=requiredCount){
      return {complete:true, outcome:conditional>0?"approved_with_conditions":"approved"};
    }
    if(mode==="sequential" && positive>=requiredCount){
      return {complete:true, outcome:conditional>0?"approved_with_conditions":"approved"};
    }
    if(rejected > tasks.length-requiredCount){
      return {complete:true, outcome:"rejected"};
    }
    return {complete:false, outcome:null};
  }

  global.INFINICUS.ABA.approvalWorkflowValidator =
    Object.freeze({validateApprovers,evaluateStage});
})(window);
