(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.metricId || input.value===undefined){
      return runtime.failure(
        "OM_BASELINE_INVALID",
        "Metric ID and baseline value are required."
      );
    }

    return runtime.success({
      baselineDefinitionId:
        input.baselineDefinitionId ||
        runtime.createId("om_baseline"),
      metricId:String(input.metricId),
      monitoringContractId:
        input.monitoringContractId || null,
      expectedOutcomeDefinitionId:
        input.expectedOutcomeDefinitionId || null,
      value:runtime.clone(input.value),
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

  global.INFINICUS.OM.baselineDefinitionModel=
    Object.freeze({create});
})(window);
