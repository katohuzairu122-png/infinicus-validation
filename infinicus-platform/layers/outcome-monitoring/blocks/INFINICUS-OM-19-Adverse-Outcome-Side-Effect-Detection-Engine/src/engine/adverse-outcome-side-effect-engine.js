(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.adverseOutcomePolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.adverseOutcomeStore.put(
      "policies",
      built.data
    );
  }

  async function registerAdverseMetric(input={}){
    if(!input.metricId || !input.adverseType){
      return runtime.failure(
        "OM_ADVERSE_METRIC_INVALID",
        "Metric ID and adverse type are required."
      );
    }

    const definition={
      adverseMetricDefinitionId:
        input.adverseMetricDefinitionId ||
        runtime.createId("om_adverse_metric"),
      metricId:String(input.metricId),
      adverseType:String(input.adverseType),
      baselineValue:Number(input.baselineValue ?? 0),
      thresholdValue:Number(input.thresholdValue ?? 0),
      direction:String(input.direction || "increase_is_adverse"),
      unit:input.unit || null,
      displacedCostRate:Number(input.displacedCostRate ?? 0),
      createdAt:new Date().toISOString()
    };

    return global.INFINICUS.OM.adverseOutcomeStore.put(
      "definitions",
      definition
    );
  }

  async function detect({
    adverseOutcomeHandoffId,
    adverseOutcomePolicyId,
    adverseEvidenceByMetric={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.benefitRealizationEngine
        .getAdverseOutcomeHandoff({
          adverseOutcomeHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.adverseOutcomeStore.get(
        "policies",
        adverseOutcomePolicyId
      );

    if(!policy.ok) return policy;

    const definitions=
      await global.INFINICUS.OM.adverseOutcomeStore.list(
        "definitions"
      );

    if(!definitions.ok) return definitions;

    const detections=[];

    for(const definition of definitions.data){
      const supplied=
        adverseEvidenceByMetric[definition.metricId];

      if(!supplied){
        continue;
      }

      if(
        policy.data.requireObservedEvidence &&
        supplied.classification!=="observed"
      ){
        return runtime.failure(
          "OM_ADVERSE_EVIDENCE_INVALID",
          "Adverse evidence must be classified as observed.",
          {metricId:definition.metricId}
        );
      }

      const actual=Number(supplied.actualValue);
      const threshold=Number(definition.thresholdValue);

      if(!Number.isFinite(actual) || !Number.isFinite(threshold)){
        return runtime.failure(
          "OM_ADVERSE_VALUE_INVALID",
          "Adverse actual and threshold values must be finite."
        );
      }

      const breached=
        definition.direction==="decrease_is_adverse"
          ? actual<threshold
          : actual>threshold;

      if(!breached){
        continue;
      }

      const magnitude=
        Math.min(
          1,
          Math.abs(actual-threshold) /
          (Math.abs(threshold) || 1)
        );

      const scored=
        global.INFINICUS.OM.adverseOutcomeScorer.score({
          magnitude,
          scope:supplied.scope ?? 0.5,
          persistence:supplied.persistence ?? 0.5,
          irreversibility:supplied.irreversibility ?? 0,
          confidence:supplied.confidence ?? 0.5
        });

      let severity="minor";

      if(scored.materiality>=policy.data.criticalMateriality){
        severity="critical";
      }else if(scored.materiality>=policy.data.warningMateriality){
        severity="warning";
      }

      const relatedBenefit=
        handoff.data.benefitAssessments.find(
          item=>item.metricId===definition.metricId
        );

      const displacedCost=
        Number(
          (
            Math.abs(actual-definition.baselineValue) *
            definition.displacedCostRate
          ).toFixed(6)
        );

      const benefitOffset=
        relatedBenefit
          ? Math.min(
              Math.max(0,relatedBenefit.actualBenefit),
              displacedCost
            )
          : 0;

      const causation=
        handoff.data.causationAssessments.find(
          item=>item.metricId===definition.metricId
        );

      const attribution=
        handoff.data.attributionAssessments.find(
          item=>item.metricId===definition.metricId
        );

      const detection={
        adverseOutcomeDetectionId:
          runtime.createId("om_adverse_detection"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:
          definition.metricId,
        adverseMetricDefinitionId:
          definition.adverseMetricDefinitionId,
        adverseType:
          definition.adverseType,
        actualValue:actual,
        thresholdValue:threshold,
        magnitude:Number(magnitude.toFixed(4)),
        materiality:scored.materiality,
        severity,
        displacedCost,
        benefitOffset,
        netAdverseImpact:
          Number((displacedCost-benefitOffset).toFixed(6)),
        persistence:
          Number(supplied.persistence ?? 0),
        irreversibility:
          Number(supplied.irreversibility ?? 0),
        mitigationRequired:
          scored.materiality>=policy.data.mitigationThreshold,
        causationClassification:
          causation?.classification || "not_assessed",
        attributionClassification:
          attribution?.classification || "not_assessed",
        confidence:
          Math.min(
            Number(supplied.confidence ?? 0),
            handoff.data.confidence,
            handoff.data.reliability
          ),
        correlationId:
          handoff.data.correlationId,
        lineage:[
          ...handoff.data.lineage.map(runtime.clone),
          ...(supplied.lineage || []).map(runtime.clone)
        ],
        detectedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.adverseOutcomeStore.put(
        "detections",
        detection
      );

      detections.push(detection);
    }

    const exceptionHandoff={
      monitoringExceptionHandoffId:
        runtime.createId("om_monitoring_exception_handoff"),
      targetBlock:"OM-20",
      monitoringContractId:
        handoff.data.monitoringContractId,
      adverseOutcomes:
        detections.map(runtime.clone),
      benefitAssessments:
        handoff.data.benefitAssessments.map(runtime.clone),
      comparisons:
        handoff.data.comparisons.map(runtime.clone),
      confidenceRatings:
        handoff.data.confidenceRatings.map(runtime.clone),
      reliabilityRatings:
        handoff.data.reliabilityRatings.map(runtime.clone),
      causationAssessments:
        handoff.data.causationAssessments.map(runtime.clone),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      confounders:
        handoff.data.confounders.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.adverseOutcomeStore.put(
      "exceptions_handoffs",
      exceptionHandoff
    );

    await runtime.emit(
      "om.adverse_outcomes.detected",
      {
        adverseOutcomeCount:detections.length,
        monitoringExceptionHandoffId:
          exceptionHandoff.monitoringExceptionHandoffId
      }
    );

    return runtime.success({
      adverseOutcomes:detections,
      monitoringExceptionHandoff:exceptionHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerAdverseMetric,
    detect,
    getDetection:({adverseOutcomeDetectionId}) =>
      global.INFINICUS.OM.adverseOutcomeStore.get(
        "detections",
        adverseOutcomeDetectionId
      ),
    getMonitoringExceptionHandoff:({
      monitoringExceptionHandoffId
    }) =>
      global.INFINICUS.OM.adverseOutcomeStore.get(
        "exceptions_handoffs",
        monitoringExceptionHandoffId
      ),
    listDetections:() =>
      global.INFINICUS.OM.adverseOutcomeStore.list(
        "detections"
      )
  });

  runtime.registerService(
    "om.adverse_outcome_side_effect_detection",
    api,
    {block:"OM-19"}
  );

  runtime.registerRoute(
    "om.adverse_outcome_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.adverse_metric.register",
    registerAdverseMetric
  );

  runtime.registerRoute(
    "om.adverse_outcomes.detect",
    detect
  );

  global.INFINICUS.OM.adverseOutcomeSideEffectEngine=api;
})(window);
