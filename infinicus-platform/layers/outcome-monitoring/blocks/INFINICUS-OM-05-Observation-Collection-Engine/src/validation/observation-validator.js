(function(global){
  "use strict";

  function validate({
    observation,
    binding,
    policy,
    collectedAt
  }){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Collection policy is inactive.");
    }

    if(observation.value===undefined){
      issues.push("Observation value is required.");
    }

    if(
      policy.requireObservedClassification &&
      observation.classification!=="observed"
    ){
      issues.push("Observation classification must be observed.");
    }

    if(
      policy.requireSourceTimestamp &&
      !observation.sourceTimestamp
    ){
      issues.push("Source timestamp is required.");
    }

    if(
      observation.sourceTimestamp &&
      policy.rejectStaleObservations
    ){
      const ageMinutes=
        (
          new Date(collectedAt).getTime() -
          new Date(observation.sourceTimestamp).getTime()
        ) / 60000;

      if(ageMinutes > binding.freshnessToleranceMinutes){
        issues.push("Observation is stale.");
      }
    }

    if(
      observation.metricId !== binding.metricId
    ){
      issues.push("Observation metric does not match source binding.");
    }

    if(
      observation.observationSourceId !==
      binding.observationSourceId
    ){
      issues.push("Observation source does not match source binding.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.OM.observationValidator=
    Object.freeze({validate});
})(window);
