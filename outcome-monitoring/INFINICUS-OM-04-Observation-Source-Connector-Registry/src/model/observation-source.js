(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.sourceType){
      return runtime.failure(
        "OM_OBSERVATION_SOURCE_INVALID",
        "Observation source name and sourceType are required."
      );
    }

    return runtime.success({
      observationSourceId:
        input.observationSourceId ||
        runtime.createId("om_observation_source"),
      sourceReference:input.sourceReference || null,
      name:String(input.name),
      sourceType:String(input.sourceType),
      ownerReference:input.ownerReference || null,
      classification:String(input.classification || "internal"),
      systemOfRecord:Boolean(input.systemOfRecord),
      observedStateOnly:input.observedStateOnly !== false,
      refreshCadenceMinutes:
        Math.max(1,Number(input.refreshCadenceMinutes || 60)),
      freshnessToleranceMinutes:
        Math.max(1,Number(input.freshnessToleranceMinutes || 120)),
      dataQualityMinimum:
        Math.max(0,Math.min(1,Number(input.dataQualityMinimum ?? 0.8))),
      environment:String(input.environment || "production"),
      region:input.region || null,
      status:String(input.status || "active"),
      healthStatus:String(input.healthStatus || "unknown"),
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.observationSourceModel=
    Object.freeze({create});
})(window);
