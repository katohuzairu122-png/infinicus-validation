(function(global){
  "use strict";

  function includesOrOpen(values,value){
    return !values.length || values.includes(value);
  }

  function evaluate({
    adapter,
    connector,
    queueItem,
    task,
    requiredCapabilities=[],
    region=null,
    environment="production"
  }){
    const issues=[];

    if(adapter.status!=="active"){
      issues.push("Execution adapter is not active.");
    }

    if(!["healthy","degraded"].includes(adapter.healthStatus)){
      issues.push("Execution adapter is not healthy.");
    }

    if(connector.status!=="active"){
      issues.push("Connector is not active.");
    }

    if(!["healthy","degraded"].includes(connector.healthStatus)){
      issues.push("Connector is not healthy.");
    }

    if(
      !includesOrOpen(
        adapter.supportedActionTypeIds,
        task.actionTypeId || queueItem.actionTypeId
      )
    ){
      issues.push("Adapter does not support this action type.");
    }

    if(
      !includesOrOpen(
        adapter.supportedTaskCodes,
        task.code
      )
    ){
      issues.push("Adapter does not support this task code.");
    }

    for(const capability of requiredCapabilities){
      if(!adapter.capabilityCodes.includes(capability)){
        issues.push(`Adapter lacks required capability: ${capability}`);
      }
    }

    if(
      region &&
      !includesOrOpen(adapter.supportedRegions,region)
    ){
      issues.push("Adapter does not support the requested region.");
    }

    if(
      !adapter.supportedEnvironments.includes(environment)
    ){
      issues.push("Adapter does not support the requested environment.");
    }

    if(connector.environment!==environment){
      issues.push("Connector environment does not match execution environment.");
    }

    if(region && connector.region && connector.region!==region){
      issues.push("Connector region does not match requested region.");
    }

    return {
      eligible:
        issues.length===0,
      issues
    };
  }

  function select(candidates){
    return candidates
      .filter(item=>item.eligible)
      .sort((left,right)=>
        right.adapter.priority-left.adapter.priority
      )[0] || null;
  }

  global.INFINICUS.ABA.executionAdapterSelector =
    Object.freeze({
      includesOrOpen,
      evaluate,
      select
    });
})(window);
