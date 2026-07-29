(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(
      !input.name ||
      !input.outcomeMetricId ||
      !input.outcomeEvidenceSourceId
    ){
      return runtime.failure(
        "ABA_EXPECTED_OUTCOME_INVALID",
        "Outcome name, metric ID, and evidence source ID are required."
      );
    }

    return runtime.success({
      expectedOutcomeDefinitionId:
        input.expectedOutcomeDefinitionId ||
        runtime.createId("aba_expected_outcome"),
      name:String(input.name),
      description:String(input.description || ""),
      outcomeMetricId:String(input.outcomeMetricId),
      outcomeEvidenceSourceId:String(input.outcomeEvidenceSourceId),
      baselineValue:runtime.clone(input.baselineValue),
      targetValue:runtime.clone(input.targetValue),
      minimumAcceptableValue:runtime.clone(input.minimumAcceptableValue),
      maximumAcceptableValue:runtime.clone(input.maximumAcceptableValue),
      tolerance:
        input.tolerance == null
          ? null
          : Number(input.tolerance),
      observationWindow:{
        startsAt:input.observationWindow?.startsAt || new Date().toISOString(),
        endsAt:input.observationWindow?.endsAt || null
      },
      reviewCadenceMinutes:
        Math.max(1,Number(input.reviewCadenceMinutes || 1440)),
      alertThresholds:
        runtime.clone(input.alertThresholds || []),
      attributionRequirements:
        runtime.clone(input.attributionRequirements || []),
      causationRequired:
        Boolean(input.causationRequired),
      confidenceMinimum:
        Math.max(0,Math.min(1,Number(input.confidenceMinimum ?? 0.6))),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.expectedOutcomeDefinitionModel=
    Object.freeze({create});
})(window);
