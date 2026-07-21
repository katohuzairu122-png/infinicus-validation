(function(global){
  "use strict";

  function validateOutcome({outcome,metric,source}){
    const issues=[];

    if(!metric || metric.status!=="active"){
      issues.push("Outcome metric is not active.");
    }

    if(!source || source.status!=="active"){
      issues.push("Outcome evidence source is not active.");
    }

    if(
      outcome.observationWindow?.endsAt &&
      new Date(outcome.observationWindow.endsAt).getTime() <=
      new Date(outcome.observationWindow.startsAt).getTime()
    ){
      issues.push("Observation window end must be after start.");
    }

    if(
      outcome.baselineValue===undefined ||
      outcome.targetValue===undefined
    ){
      issues.push("Baseline and target values are required.");
    }

    if(
      source?.observedStateOnly !== true
    ){
      issues.push("Outcome source must provide observed-state evidence.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  function validateContract(contract){
    const issues=[];

    if(!contract.actionInstanceId){
      issues.push("Action instance ID is required.");
    }

    if(!contract.actionCompletionCertificateId){
      issues.push("Completion certificate ID is required.");
    }

    if(!Array.isArray(contract.outcomes) || !contract.outcomes.length){
      issues.push("At least one expected outcome is required.");
    }

    if(
      contract.outcomes.some(item =>
        !item.metric ||
        !item.source ||
        !item.definition
      )
    ){
      issues.push("Each outcome requires definition, metric, and source.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.monitoringContractValidator=
    Object.freeze({
      validateOutcome,
      validateContract
    });
})(window);
