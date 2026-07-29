(function(global){
  "use strict";

  function create({
    monitoringContractId,
    outcomeDefinition,
    metric,
    source,
    correlationId,
    lineage,
    confidence
  }={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!metric?.code || !metric?.valueType){
      return runtime.failure(
        "OM_METRIC_DEFINITION_INVALID",
        "Metric code and value type are required."
      );
    }

    const metricId=
      metric.outcomeMetricId ||
      metric.metricId ||
      runtime.createId("om_metric");

    return runtime.success({
      metricId,
      sourceMetricId:metricId,
      monitoringContractId,
      expectedOutcomeDefinitionId:
        outcomeDefinition?.expectedOutcomeDefinitionId || null,
      code:String(metric.code),
      name:String(metric.name || metric.code),
      description:String(metric.description || ""),
      valueType:String(metric.valueType),
      unit:metric.unit || null,
      aggregation:String(metric.aggregation || "latest"),
      direction:String(metric.direction || "increase"),
      sourceField:metric.sourceField || null,
      formula:metric.formula || null,
      baselineValue:runtime.clone(outcomeDefinition?.baselineValue),
      targetValue:runtime.clone(outcomeDefinition?.targetValue),
      minimumAcceptableValue:
        runtime.clone(outcomeDefinition?.minimumAcceptableValue),
      maximumAcceptableValue:
        runtime.clone(outcomeDefinition?.maximumAcceptableValue),
      tolerance:
        outcomeDefinition?.tolerance == null
          ? null
          : Number(outcomeDefinition.tolerance),
      observationWindow:
        runtime.clone(outcomeDefinition?.observationWindow || {}),
      reviewCadenceMinutes:
        Number(outcomeDefinition?.reviewCadenceMinutes || 1440),
      causationRequired:
        Boolean(outcomeDefinition?.causationRequired),
      attributionRequirements:
        runtime.clone(outcomeDefinition?.attributionRequirements || []),
      confidenceMinimum:
        Number(outcomeDefinition?.confidenceMinimum ?? 0.6),
      observationSourceReference:
        source?.outcomeEvidenceSourceId ||
        source?.observationSourceId ||
        null,
      correlationId:correlationId || null,
      lineage:runtime.clone(lineage || []),
      confidence:Number(confidence ?? 0),
      version:1,
      status:"active",
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.metricDefinitionModel=
    Object.freeze({create});
})(window);
