(function(global){
  "use strict";

  function run(){
    const OM=global.INFINICUS.OM;

    const requiredComponents=[
      "resultEnvelope",
      "idFactory",
      "serviceRegistry",
      "routeRegistry",
      "eventBus",
      "lifecycleRegistry",
      "metricRegistry",
      "observationSourceRegistry",
      "monitoringContractRegistry",
      "outcomeStateRegistry",
      "blockManifest"
    ];

    const checks=requiredComponents.map(component=>({
      component,
      available:Boolean(OM[component])
    }));

    const missing=checks.filter(item=>!item.available);

    return OM.resultEnvelope.success({
      healthy:missing.length===0,
      checks,
      missing,
      manifestBlockCount:OM.blockManifest?.length || 0,
      generatedAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.diagnostics=
    Object.freeze({run});
})(window);
