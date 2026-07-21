(function(global){
  "use strict";

  function validate({statePackage,policy,destination}){
    const issues=[];

    if(policy.status!=="active") issues.push("Publication policy is inactive.");
    if(destination.status!=="active") issues.push("Destination is inactive.");
    if(!["healthy","degraded"].includes(destination.healthStatus)){
      issues.push("Business Digital Twin destination is not healthy.");
    }

    if(!statePackage.businessId){
      issues.push("Business ID is required.");
    }

    if(
      Number(statePackage.dataQualityScore ?? 0) <
      policy.requireDataQualityMinimum
    ){
      issues.push("Data-quality score is below publication minimum.");
    }

    if(
      Number(statePackage.confidence ?? 0) <
      policy.requireConfidenceMinimum
    ){
      issues.push("Confidence is below publication minimum.");
    }

    if(
      policy.requireLineage &&
      (!Array.isArray(statePackage.lineage) || !statePackage.lineage.length)
    ){
      issues.push("Intelligence lineage is required.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.BI.twinPublicationValidator=
    Object.freeze({validate});
})(window);
