(function(global){
  "use strict";

  function validate({
    runtime,
    manifest,
    config={}
  }={}){
    const issues=[];
    const services=[];

    for(const block of manifest.blocks){
      const present=
        Boolean(global.INFINICUS?.OM?.[block.serviceKey]);

      services.push({
        block:block.block,
        serviceKey:block.serviceKey,
        present
      });

      if(block.required && !present){
        issues.push(
          `${block.block} service is missing: ${block.serviceKey}`
        );
      }
    }

    const routes=[];

    for(const routeName of manifest.requiredRoutes){
      let present=false;

      try{
        present=Boolean(
          runtime.getRoute?.(routeName) ||
          runtime.routes?.get?.(routeName)
        );
      }catch{
        present=false;
      }

      routes.push({routeName,present});

      if(!present){
        issues.push(`Required route is missing: ${routeName}`);
      }
    }

    if(config.environment && !["development","staging","production"].includes(config.environment)){
      issues.push("Deployment environment is invalid.");
    }

    if(
      config.environment==="production" &&
      !config.releaseVersion
    ){
      issues.push("Release version is required for production.");
    }

    return {
      ready:issues.length===0,
      issues,
      services,
      routes
    };
  }

  global.INFINICUS.OM.outcomeMonitoringReadinessValidator=
    Object.freeze({validate});
})(window);
