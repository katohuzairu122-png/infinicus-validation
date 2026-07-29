(function(global){
  "use strict";

  function validate({
    handoff,
    policy,
    destination
  }){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Publication policy is not active.");
    }

    if(destination.status!=="active"){
      issues.push("Monitoring destination is not active.");
    }

    if(
      !["healthy","degraded"].includes(
        destination.healthStatus
      )
    ){
      issues.push("Monitoring destination is not healthy.");
    }

    if(!handoff.outcomeMonitoringContractId){
      issues.push("Monitoring contract ID is required.");
    }

    if(
      !Array.isArray(handoff.outcomes) ||
      !handoff.outcomes.length
    ){
      issues.push("Published monitoring contract requires outcomes.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.outcomePublicationValidator=
    Object.freeze({validate});
})(window);
