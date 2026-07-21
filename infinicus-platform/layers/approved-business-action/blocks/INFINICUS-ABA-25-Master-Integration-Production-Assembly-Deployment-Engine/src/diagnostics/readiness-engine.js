(function(global){
  "use strict";

  function inspectRuntime(runtime){
    const issues=[];

    if(!runtime){
      issues.push("ABA-01 runtime is unavailable.");
      return {ready:false,issues};
    }

    const requiredMethods=[
      "registerService",
      "registerRoute",
      "registerBlock",
      "emit"
    ];

    for(const method of requiredMethods){
      if(typeof runtime[method]!=="function"){
        issues.push(`Runtime method missing: ${method}`);
      }
    }

    return {
      ready:issues.length===0,
      issues
    };
  }

  function assess({
    dependencyResult,
    configResult,
    runtimeResult
  }){
    const issues=[
      ...dependencyResult.missing.map(item=>
        `Missing block: ${item.blockId} ${item.name}`
      ),
      ...configResult.issues,
      ...runtimeResult.issues
    ];

    return {
      productionReady:issues.length===0,
      issueCount:issues.length,
      issues,
      dependencyReady:dependencyResult.ready,
      configurationReady:configResult.valid,
      runtimeReady:runtimeResult.ready
    };
  }

  global.INFINICUS.ABA.masterReadinessEngine =
    Object.freeze({
      inspectRuntime,
      assess
    });
})(window);
