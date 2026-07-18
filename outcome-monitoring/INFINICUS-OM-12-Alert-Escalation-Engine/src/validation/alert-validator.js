(function(global){
  "use strict";

  function validateBreach(breach,policy){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Alert policy is inactive.");
    }

    if(!breach.thresholdBreachId){
      issues.push("Threshold breach ID is required.");
    }

    if(!["warning","critical"].includes(breach.severity)){
      issues.push("Only warning and critical breaches create alerts.");
    }

    if(!policy.routes?.[breach.severity]){
      issues.push("No alert route is configured for this severity.");
    }

    if(!breach.metricId){
      issues.push("Metric ID is required.");
    }

    if(!Array.isArray(breach.lineage) || !breach.lineage.length){
      issues.push("Breach lineage is required.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.OM.alertValidator=
    Object.freeze({validateBreach});
})(window);
