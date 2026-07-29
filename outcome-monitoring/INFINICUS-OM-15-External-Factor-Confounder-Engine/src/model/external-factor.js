(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.factorType){
      return runtime.failure(
        "OM_EXTERNAL_FACTOR_INVALID",
        "External factor name and factorType are required."
      );
    }

    return runtime.success({
      externalFactorId:
        input.externalFactorId ||
        runtime.createId("om_external_factor"),
      name:String(input.name),
      factorType:String(input.factorType),
      description:String(input.description || ""),
      affectedMetricIds:
        runtime.clone(input.affectedMetricIds || []),
      startsAt:input.startsAt || null,
      endsAt:input.endsAt || null,
      direction:String(input.direction || "unknown"),
      magnitude:
        Math.max(0,Math.min(1,Number(input.magnitude ?? 0))),
      confidence:
        Math.max(0,Math.min(1,Number(input.confidence ?? 0.5))),
      evidence:
        runtime.clone(input.evidence || []),
      lineage:
        runtime.clone(input.lineage || []),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.externalFactorModel=
    Object.freeze({create});
})(window);
