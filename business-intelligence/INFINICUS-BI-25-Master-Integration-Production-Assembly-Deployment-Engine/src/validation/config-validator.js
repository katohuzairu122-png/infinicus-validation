(function(global){
  "use strict";

  function validate(config={}){
    const issues=[];

    if(!["development","staging","production"].includes(config.environment)){
      issues.push("Environment is invalid.");
    }

    if(config.security?.allowBrowserSecrets===true){
      issues.push("Browser-visible secrets are prohibited.");
    }

    if(
      config.environment==="production" &&
      !config.security?.secretManagerReference
    ){
      issues.push("Production requires a secret-manager reference.");
    }

    if(
      Number(config.dataGovernance?.minimumDataQuality ?? 0) < 0.5
    ){
      issues.push("Minimum data quality is too low.");
    }

    if(
      Number(config.dataGovernance?.minimumConfidence ?? 0) < 0.5
    ){
      issues.push("Minimum confidence is too low.");
    }

    if(config.dataGovernance?.requireLineage!==true){
      issues.push("Intelligence lineage must be required.");
    }

    if(config.dataGovernance?.observedStateSeparation!==true){
      issues.push("Observed-state separation must be enabled.");
    }

    if(config.handoffs?.businessDigitalTwinEnabled!==true){
      issues.push("Business Digital Twin handoff must be enabled.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.BI.masterConfigValidator=Object.freeze({validate});
})(window);
