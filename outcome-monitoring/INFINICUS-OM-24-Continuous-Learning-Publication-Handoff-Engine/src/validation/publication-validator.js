(function(global){
  "use strict";

  function validate({
    handoff,
    policy,
    target
  }={}){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Publication policy is inactive.");
    }

    if(target.status!=="active"){
      issues.push("Publication target is inactive.");
    }

    if(!handoff.outcomeLearningPackageId){
      issues.push("Learning package ID is required.");
    }

    if(
      Number(handoff.confidence ?? 0) <
      policy.minimumConfidence
    ){
      issues.push("Learning confidence is below publication minimum.");
    }

    if(
      Number(handoff.reliability ?? 0) <
      policy.minimumReliability
    ){
      issues.push("Learning reliability is below publication minimum.");
    }

    if(
      policy.requireApplicabilityScope &&
      !handoff.applicabilityScope
    ){
      issues.push("Applicability scope is required.");
    }

    if(
      policy.requireLimitations &&
      !Array.isArray(handoff.limitations)
    ){
      issues.push("Limitations are required.");
    }

    if(
      !policy.allowHypotheses &&
      Array.isArray(handoff.hypotheses) &&
      handoff.hypotheses.length
    ){
      issues.push("Hypotheses are not allowed by publication policy.");
    }

    if(!Array.isArray(handoff.lineage) || !handoff.lineage.length){
      issues.push("Learning lineage is required.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  global.INFINICUS.OM.learningPublicationValidator=
    Object.freeze({validate});
})(window);
