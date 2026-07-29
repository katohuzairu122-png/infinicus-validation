(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.benefitRealizationPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.benefitRealizationStore.put(
      "policies",
      built.data
    );
  }

  async function registerBenefitDefinition(input={}){
    if(!input.metricId || !input.benefitType){
      return runtime.failure(
        "OM_BENEFIT_DEFINITION_INVALID",
        "Metric ID and benefit type are required."
      );
    }

    const definition={
      benefitDefinitionId:
        input.benefitDefinitionId ||
        runtime.createId("om_benefit_definition"),
      metricId:String(input.metricId),
      benefitType:String(input.benefitType),
      expectedBenefit:Number(input.expectedBenefit ?? 0),
      actionCost:Number(input.actionCost ?? 0),
      currency:input.currency || null,
      unit:input.unit || null,
      startedAt:input.startedAt || null,
      sustainabilityEvidence:
        runtime.clone(input.sustainabilityEvidence || []),
      createdAt:new Date().toISOString()
    };

    return global.INFINICUS.OM.benefitRealizationStore.put(
      "definitions",
      definition
    );
  }

  async function assess({
    benefitRealizationHandoffId,
    benefitRealizationPolicyId,
    realizedBenefitByMetric={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.outcomeConfidenceReliabilityEngine
        .getBenefitRealizationHandoff({
          benefitRealizationHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.benefitRealizationStore.get(
        "policies",
        benefitRealizationPolicyId
      );

    if(!policy.ok) return policy;

    const definitions=
      await global.INFINICUS.OM.benefitRealizationStore.list(
        "definitions"
      );

    if(!definitions.ok) return definitions;

    const assessments=[];

    for(const comparison of handoff.data.comparisons){
      const confidence=
        handoff.data.confidenceRatings.find(
          item=>item.metricId===comparison.metricId
        );

      const reliability=
        handoff.data.reliabilityRatings.find(
          item=>item.metricId===comparison.metricId
        );

      const definition=
        definitions.data.find(
          item=>item.metricId===comparison.metricId
        );

      if(!definition){
        continue;
      }

      const actualInput=
        realizedBenefitByMetric[comparison.metricId] || {};

      const calculated=
        global.INFINICUS.OM.benefitRealizationCalculator.calculate({
          expectedBenefit:definition.expectedBenefit,
          actualBenefit:
            actualInput.actualBenefit ?? comparison.actualValue,
          actionCost:definition.actionCost,
          startedAt:definition.startedAt,
          realizedAt:actualInput.realizedAt || new Date().toISOString(),
          sustainabilityScore:
            actualInput.sustainabilityScore ?? 0
        });

      if(!calculated.valid){
        return runtime.failure(
          "OM_BENEFIT_REALIZATION_FAILED",
          "Benefit realization calculation failed.",
          {
            metricId:comparison.metricId,
            issues:calculated.issues
          }
        );
      }

      const confidenceScore=
        Number(confidence?.confidenceScore ?? 0);

      const reliabilityScore=
        Number(reliability?.reliabilityScore ?? 0);

      let status="unrealized";

      if(
        confidenceScore<policy.data.minimumConfidence ||
        reliabilityScore<policy.data.minimumReliability
      ){
        status="inconclusive";
      }else if(
        calculated.realizationRatio>=policy.data.realizedThreshold &&
        calculated.sustainabilityScore>=policy.data.sustainabilityMinimum
      ){
        status="realized";
      }else if(
        calculated.realizationRatio>=policy.data.partialThreshold
      ){
        status="partially_realized";
      }

      const assessment={
        benefitRealizationAssessmentId:
          runtime.createId("om_benefit_assessment"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:
          comparison.metricId,
        benefitDefinitionId:
          definition.benefitDefinitionId,
        expectedActualComparisonId:
          comparison.expectedActualComparisonId,
        benefitType:
          definition.benefitType,
        expectedBenefit:
          calculated.expectedBenefit,
        actualBenefit:
          calculated.actualBenefit,
        actionCost:
          calculated.actionCost,
        netBenefit:
          calculated.netBenefit,
        benefitCostRatio:
          calculated.benefitCostRatio,
        realizationRatio:
          calculated.realizationRatio,
        realizationPercent:
          calculated.realizationPercent,
        timeToBenefitDays:
          calculated.timeToBenefitDays,
        sustainabilityScore:
          calculated.sustainabilityScore,
        confidenceScore,
        reliabilityScore,
        status,
        correlationId:
          handoff.data.correlationId,
        lineage:[
          ...handoff.data.lineage.map(runtime.clone),
          ...comparison.lineage.map(runtime.clone)
        ],
        assessedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.benefitRealizationStore.put(
        "assessments",
        assessment
      );

      assessments.push(assessment);
    }

    const adverseHandoff={
      adverseOutcomeHandoffId:
        runtime.createId("om_adverse_outcome_handoff"),
      targetBlock:"OM-19",
      monitoringContractId:
        handoff.data.monitoringContractId,
      benefitAssessments:
        assessments.map(runtime.clone),
      comparisons:
        handoff.data.comparisons.map(runtime.clone),
      interpretations:
        handoff.data.interpretations.map(runtime.clone),
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

    await global.INFINICUS.OM.benefitRealizationStore.put(
      "adverse_handoffs",
      adverseHandoff
    );

    await runtime.emit(
      "om.benefits.assessed",
      {
        assessmentCount:assessments.length,
        adverseOutcomeHandoffId:
          adverseHandoff.adverseOutcomeHandoffId
      }
    );

    return runtime.success({
      benefitAssessments:assessments,
      adverseOutcomeHandoff:adverseHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerBenefitDefinition,
    assess,
    getAssessment:({benefitRealizationAssessmentId}) =>
      global.INFINICUS.OM.benefitRealizationStore.get(
        "assessments",
        benefitRealizationAssessmentId
      ),
    getAdverseOutcomeHandoff:({adverseOutcomeHandoffId}) =>
      global.INFINICUS.OM.benefitRealizationStore.get(
        "adverse_handoffs",
        adverseOutcomeHandoffId
      ),
    listAssessments:() =>
      global.INFINICUS.OM.benefitRealizationStore.list(
        "assessments"
      )
  });

  runtime.registerService(
    "om.benefit_realization",
    api,
    {block:"OM-18"}
  );

  runtime.registerRoute(
    "om.benefit_realization_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.benefit_definition.register",
    registerBenefitDefinition
  );

  runtime.registerRoute(
    "om.benefit_realization.assess",
    assess
  );

  global.INFINICUS.OM.benefitRealizationEngine=api;
})(window);
