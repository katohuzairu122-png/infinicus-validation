(function(global){
  "use strict";

  function validate({metric,source,connector}){
    const issues=[];

    if(!metric?.metricId){
      issues.push("Metric ID is required.");
    }

    if(source.status!=="active"){
      issues.push("Observation source is inactive.");
    }

    if(source.observedStateOnly!==true){
      issues.push("Observation source must provide observed-state evidence.");
    }

    if(!["healthy","degraded"].includes(source.healthStatus)){
      issues.push("Observation source is not healthy.");
    }

    if(connector.status!=="active"){
      issues.push("Observation connector is inactive.");
    }

    if(!["healthy","degraded"].includes(connector.healthStatus)){
      issues.push("Observation connector is not healthy.");
    }

    if(
      connector.supportedSourceTypes.length &&
      !connector.supportedSourceTypes.includes(source.sourceType)
    ){
      issues.push("Connector does not support the source type.");
    }

    if(
      connector.supportedValueTypes.length &&
      !connector.supportedValueTypes.includes(metric.valueType)
    ){
      issues.push("Connector does not support the metric value type.");
    }

    if(
      connector.environment !== source.environment
    ){
      issues.push("Source and connector environments do not match.");
    }

    if(
      connector.region &&
      source.region &&
      connector.region !== source.region
    ){
      issues.push("Source and connector regions do not match.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.OM.sourceBindingValidator=
    Object.freeze({validate});
})(window);
