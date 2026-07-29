(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code || !input.valueType){
      return runtime.failure(
        "ABA_OUTCOME_METRIC_INVALID",
        "Metric name, code, and valueType are required."
      );
    }

    return runtime.success({
      outcomeMetricId:
        input.outcomeMetricId ||
        runtime.createId("aba_outcome_metric"),
      name:String(input.name),
      code:String(input.code),
      description:String(input.description || ""),
      valueType:String(input.valueType),
      unit:input.unit || null,
      aggregation:String(input.aggregation || "latest"),
      direction:String(input.direction || "increase"),
      sourceField:input.sourceField || null,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.outcomeMetricModel=
    Object.freeze({create});
})(window);
