(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.metricId || input.targetValue===undefined){
      return runtime.failure(
        "OM_TARGET_INVALID",
        "Metric ID and target value are required."
      );
    }

    return runtime.success({
      targetDefinitionId:
        input.targetDefinitionId ||
        runtime.createId("om_target"),
      metricId:String(input.metricId),
      monitoringContractId:
        input.monitoringContractId || null,
      expectedOutcomeDefinitionId:
        input.expectedOutcomeDefinitionId || null,
      targetValue:runtime.clone(input.targetValue),
      minimumAcceptableValue:
        runtime.clone(input.minimumAcceptableValue),
      maximumAcceptableValue:
        runtime.clone(input.maximumAcceptableValue),
      tolerance:
        input.tolerance == null ? null : Number(input.tolerance),
      direction:String(input.direction || "increase"),
      unit:input.unit || null,
      effectiveFrom:
        input.effectiveFrom || new Date().toISOString(),
      effectiveTo:input.effectiveTo || null,
      provenanceType:String(input.provenanceType || "contract"),
      provenanceReference:
        input.provenanceReference || null,
      confidence:
        Math.max(0,Math.min(1,Number(input.confidence ?? 0.7))),
      lineage:runtime.clone(input.lineage || []),
      version:1,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.targetDefinitionModel=
    Object.freeze({create});
})(window);
