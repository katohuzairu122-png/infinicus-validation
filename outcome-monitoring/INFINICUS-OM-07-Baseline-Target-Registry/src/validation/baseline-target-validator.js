(function(global){
  "use strict";

  function validateBaseline(baseline){
    const issues=[];

    if(!baseline.metricId) issues.push("Metric ID is required.");
    if(baseline.value===undefined) issues.push("Baseline value is required.");

    if(
      baseline.effectiveTo &&
      new Date(baseline.effectiveTo).getTime() <=
      new Date(baseline.effectiveFrom).getTime()
    ){
      issues.push("Baseline effective period is invalid.");
    }

    if(!Array.isArray(baseline.lineage) || !baseline.lineage.length){
      issues.push("Baseline lineage is required.");
    }

    return {valid:issues.length===0,issues};
  }

  function validateTarget(target){
    const issues=[];

    if(!target.metricId) issues.push("Metric ID is required.");
    if(target.targetValue===undefined) issues.push("Target value is required.");

    if(
      target.effectiveTo &&
      new Date(target.effectiveTo).getTime() <=
      new Date(target.effectiveFrom).getTime()
    ){
      issues.push("Target effective period is invalid.");
    }

    if(
      target.minimumAcceptableValue!==undefined &&
      target.maximumAcceptableValue!==undefined &&
      Number(target.minimumAcceptableValue) >
      Number(target.maximumAcceptableValue)
    ){
      issues.push("Minimum acceptable value exceeds maximum acceptable value.");
    }

    if(
      !["increase","decrease","maintain","range"].includes(target.direction)
    ){
      issues.push("Target direction is invalid.");
    }

    if(!Array.isArray(target.lineage) || !target.lineage.length){
      issues.push("Target lineage is required.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.OM.baselineTargetValidator=
    Object.freeze({
      validateBaseline,
      validateTarget
    });
})(window);
