(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.expectedActualComparisonPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.expectedActualComparisonStore.put(
      "policies",
      built.data
    );
  }

  function classify({
    achievementRatio,
    achieved,
    confidence,
    policy
  }){
    if(confidence<policy.minimumConfidence){
      return "low_confidence";
    }

    if(achieved || achievementRatio>=policy.achievementThreshold){
      return "achieved";
    }

    if(achievementRatio>=policy.acceptableThreshold){
      return "acceptable";
    }

    if(achievementRatio>=policy.underperformanceThreshold){
      return "underperforming";
    }

    return "failed";
  }

  async function compare({
    expectedActualComparisonHandoffId,
    expectedActualComparisonPolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.externalFactorConfounderEngine
        .getExpectedActualComparisonHandoff({
          expectedActualComparisonHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.expectedActualComparisonStore.get(
        "policies",
        expectedActualComparisonPolicyId
      );

    if(!policy.ok) return policy;

    const comparisons=[];
    const interpretations=[];

    for(const progress of handoff.data.progressRecords){
      const causation=
        handoff.data.causationAssessments.find(
          item=>item.metricId===progress.metricId
        );

      const attribution=
        handoff.data.attributionAssessments.find(
          item=>item.metricId===progress.metricId
        );

      const metricConfounders=
        handoff.data.confounders.filter(
          item=>item.metricId===progress.metricId
        );

      const calculated=
        global.INFINICUS.OM.expectedActualComparisonCalculator.calculate({
          expected:progress.targetValue,
          actual:progress.currentValue,
          direction:progress.direction
        });

      if(!calculated.valid){
        return runtime.failure(
          "OM_EXPECTED_ACTUAL_COMPARISON_FAILED",
          "Expected-versus-actual comparison failed.",
          {
            metricId:progress.metricId,
            issues:calculated.issues
          }
        );
      }

      const rawConfidence=
        Math.min(
          progress.confidence,
          attribution?.confidence ?? 1,
          causation?.confidence ?? 1,
          handoff.data.confidence
        );

      const confounderPenalty=
        policy.data.applyConfounderAdjustment
          ? Math.min(
              1,
              metricConfounders.reduce(
                (sum,item)=>sum+item.materiality*item.confidence,
                0
              )
            )
          : 0;

      const adjustedConfidence=
        Number(
          (
            rawConfidence *
            (1-confounderPenalty)
          ).toFixed(4)
        );

      const status=
        classify({
          achievementRatio:calculated.achievementRatio,
          achieved:calculated.achieved,
          confidence:adjustedConfidence,
          policy:policy.data
        });

      const comparison={
        expectedActualComparisonId:
          runtime.createId("om_expected_actual_comparison"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:
          progress.metricId,
        outcomeProgressId:
          progress.outcomeProgressId,
        expectedValue:
          calculated.expectedValue,
        actualValue:
          calculated.actualValue,
        absoluteGap:
          calculated.absoluteGap,
        percentageGap:
          calculated.percentageGap,
        achievementRatio:
          calculated.achievementRatio,
        achieved:
          calculated.achieved,
        rawConfidence,
        confounderPenalty:
          Number(confounderPenalty.toFixed(4)),
        adjustedConfidence,
        causationClassification:
          causation?.classification || "not_assessed",
        attributionClassification:
          attribution?.classification || "not_assessed",
        classification:"calculated",
        outcomeStatus:status,
        correlationId:
          handoff.data.correlationId,
        lineage:[
          ...handoff.data.lineage.map(runtime.clone),
          ...progress.lineage.map(runtime.clone)
        ],
        comparedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.expectedActualComparisonStore.put(
        "comparisons",
        comparison
      );

      const interpretation={
        outcomeComparisonInterpretationId:
          runtime.createId("om_comparison_interpretation"),
        expectedActualComparisonId:
          comparison.expectedActualComparisonId,
        metricId:
          progress.metricId,
        outcomeStatus:
          status,
        causalInterpretation:
          causation?.causationEstablished === true
            ? "causal_support_present"
            : "causation_not_established",
        confounderContext:
          metricConfounders.map(runtime.clone),
        adjustedConfidence,
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.expectedActualComparisonStore.put(
        "interpretations",
        interpretation
      );

      comparisons.push(comparison);
      interpretations.push(interpretation);
    }

    const confidenceHandoff={
      confidenceReliabilityHandoffId:
        runtime.createId("om_confidence_reliability_handoff"),
      targetBlock:"OM-17",
      monitoringContractId:
        handoff.data.monitoringContractId,
      comparisons:
        comparisons.map(runtime.clone),
      interpretations:
        interpretations.map(runtime.clone),
      causationAssessments:
        handoff.data.causationAssessments.map(runtime.clone),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      externalFactorAssessments:
        handoff.data.externalFactorAssessments.map(runtime.clone),
      confounders:
        handoff.data.confounders.map(runtime.clone),
      residualConfoundingScore:
        handoff.data.residualConfoundingScore,
      progressRecords:
        handoff.data.progressRecords.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        comparisons.length
          ? Number(
              (
                comparisons.reduce(
                  (sum,item)=>sum+item.adjustedConfidence,
                  0
                ) / comparisons.length
              ).toFixed(4)
            )
          : 0,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.expectedActualComparisonStore.put(
      "confidence_handoffs",
      confidenceHandoff
    );

    await runtime.emit(
      "om.expected_actual.compared",
      {
        comparisonCount:comparisons.length,
        confidenceReliabilityHandoffId:
          confidenceHandoff.confidenceReliabilityHandoffId
      }
    );

    return runtime.success({
      comparisons,
      interpretations,
      confidenceReliabilityHandoff:confidenceHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    compare,
    getComparison:({expectedActualComparisonId}) =>
      global.INFINICUS.OM.expectedActualComparisonStore.get(
        "comparisons",
        expectedActualComparisonId
      ),
    getConfidenceReliabilityHandoff:({
      confidenceReliabilityHandoffId
    }) =>
      global.INFINICUS.OM.expectedActualComparisonStore.get(
        "confidence_handoffs",
        confidenceReliabilityHandoffId
      ),
    listComparisons:() =>
      global.INFINICUS.OM.expectedActualComparisonStore.list(
        "comparisons"
      )
  });

  runtime.registerService(
    "om.expected_actual_comparison",
    api,
    {block:"OM-16"}
  );

  runtime.registerRoute(
    "om.expected_actual_comparison_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.expected_actual.compare",
    compare
  );

  global.INFINICUS.OM.expectedActualComparisonEngine=api;
})(window);
