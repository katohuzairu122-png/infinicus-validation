(function(global){
  "use strict";

  function validateOutcome(item,policy){
    const issues=[];
    const definition=item?.definition || {};
    const metric=item?.metric || {};
    const source=item?.source || {};

    if(!definition.expectedOutcomeDefinitionId){
      issues.push("Expected outcome definition ID is required.");
    }

    if(!metric.outcomeMetricId && !metric.metricId){
      issues.push("Metric ID is required.");
    }

    if(!metric.code || !metric.valueType){
      issues.push("Metric code and value type are required.");
    }

    if(!source.outcomeEvidenceSourceId && !source.observationSourceId){
      issues.push("Evidence source ID is required.");
    }

    if(policy.requireObservedSources && source.observedStateOnly !== true){
      issues.push("Evidence source must provide observed-state evidence.");
    }

    if(definition.baselineValue===undefined){
      issues.push("Baseline value is required.");
    }

    if(definition.targetValue===undefined){
      issues.push("Target value is required.");
    }

    const startsAt=definition.observationWindow?.startsAt;
    const endsAt=definition.observationWindow?.endsAt;

    if(!startsAt){
      issues.push("Observation window start is required.");
    }

    if(!endsAt && !policy.allowOpenEndedWindow){
      issues.push("Observation window end is required.");
    }

    if(
      startsAt &&
      endsAt &&
      new Date(endsAt).getTime() <= new Date(startsAt).getTime()
    ){
      issues.push("Observation window end must be after start.");
    }

    if(
      Number(definition.confidenceMinimum ?? 0) <
      policy.minimumConfidence
    ){
      issues.push("Outcome confidence requirement is below policy minimum.");
    }

    return issues;
  }

  function validateContract(contract,policy){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Intake policy is inactive.");
    }

    if(!contract.outcomeMonitoringContractId){
      issues.push("Monitoring contract ID is required.");
    }

    if(!contract.actionInstanceId){
      issues.push("Action instance ID is required.");
    }

    if(!contract.actionCompletionCertificateId){
      issues.push("Completion certificate ID is required.");
    }

    if(!Array.isArray(contract.outcomes) || !contract.outcomes.length){
      issues.push("At least one outcome is required.");
    }

    if(policy.requireLineage && (!Array.isArray(contract.lineage) || !contract.lineage.length)){
      issues.push("Contract lineage is required.");
    }

    if(
      Number(contract.confidence ?? 0) <
      policy.minimumConfidence
    ){
      issues.push("Contract confidence is below policy minimum.");
    }

    for(const [index,item] of (contract.outcomes || []).entries()){
      for(const issue of validateOutcome(item,policy)){
        issues.push(`Outcome ${index+1}: ${issue}`);
      }
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.OM.monitoringContractValidator=
    Object.freeze({validateContract});
})(window);
