(function(global){
  "use strict";

  function validate(config={}){
    const issues=[];

    if(!["development","staging","production"].includes(config.environment)){
      issues.push("environment must be development, staging, or production.");
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

    if(config.execution?.requireDryRun!==true){
      issues.push("Controlled execution requires dry-run validation.");
    }

    if(config.execution?.requireIdempotency!==true){
      issues.push("Controlled execution requires idempotency.");
    }

    if(config.execution?.requireQueueLease!==true){
      issues.push("Controlled execution requires queue leasing.");
    }

    if(config.handoffs?.outcomeMonitoringEnabled!==true){
      issues.push("Outcome Monitoring handoff must be enabled.");
    }

    if(config.handoffs?.continuousLearningEnabled!==true){
      issues.push("Continuous Learning handoff must be enabled.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.masterConfigValidator =
    Object.freeze({validate});
})(window);
