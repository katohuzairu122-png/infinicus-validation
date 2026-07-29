(function(global){
  "use strict";

  function validate(metric){
    const issues=[];

    if(!metric.metricId) issues.push("Metric ID is required.");
    if(!metric.code) issues.push("Metric code is required.");
    if(!metric.valueType) issues.push("Metric value type is required.");
    if(!metric.monitoringContractId){
      issues.push("Monitoring contract ID is required.");
    }
    if(!metric.observationSourceReference){
      issues.push("Observation source reference is required.");
    }

    if(
      metric.observationWindow?.endsAt &&
      new Date(metric.observationWindow.endsAt).getTime() <=
      new Date(metric.observationWindow.startsAt).getTime()
    ){
      issues.push("Observation window is invalid.");
    }

    if(metric.confidenceMinimum<0 || metric.confidenceMinimum>1){
      issues.push("Confidence minimum must be between 0 and 1.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.OM.metricDefinitionValidator=
    Object.freeze({validate});
})(window);
