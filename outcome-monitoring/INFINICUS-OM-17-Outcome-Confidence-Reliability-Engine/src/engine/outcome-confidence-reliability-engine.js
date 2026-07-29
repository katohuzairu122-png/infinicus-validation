(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.outcomeConfidencePolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.outcomeConfidenceStore.put(
      "policies",
      built.data
    );
  }

  async function rate({
    confidenceReliabilityHandoffId,
    outcomeConfidencePolicyId,
    evidenceDimensionsByMetric={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.expectedActualComparisonEngine
        .getConfidenceReliabilityHandoff({
          confidenceReliabilityHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.outcomeConfidenceStore.get(
        "policies",
        outcomeConfidencePolicyId
      );

    if(!policy.ok) return policy;

    const ratings=[];
    const reliabilityRatings=[];

    for(const comparison of handoff.data.comparisons){
      const attribution=
        handoff.data.attributionAssessments.find(
          item=>item.metricId===comparison.metricId
        );

      const causation=
        handoff.data.causationAssessments.find(
          item=>item.metricId===comparison.metricId
        );

      const supplied=
        evidenceDimensionsByMetric[comparison.metricId] || {};

      const dimensions={
        comparisonConfidence:
          comparison.adjustedConfidence,
        attributionConfidence:
          attribution?.confidence ?? 0,
        causationConfidence:
          causation?.confidence ?? 0,
        sourceReliability:
          Number(supplied.sourceReliability ?? 0.7),
        sampleSufficiency:
          Number(supplied.sampleSufficiency ?? 0.5),
        temporalCoverage:
          Number(supplied.temporalCoverage ?? 0.5),
        evidenceCompleteness:
          Number(supplied.evidenceCompleteness ?? 0.5)
      };

      const missingEvidenceCount=
        Object.values(dimensions).filter(
          value=>Number(value)<=0
        ).length;

      const scored=
        global.INFINICUS.OM.confidenceReliabilityScorer.score({
          dimensions,
          residualConfoundingScore:
            handoff.data.residualConfoundingScore,
          missingEvidenceCount,
          policy:policy.data
        });

      const rating={
        outcomeConfidenceRatingId:
          runtime.createId("om_outcome_confidence"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:
          comparison.metricId,
        expectedActualComparisonId:
          comparison.expectedActualComparisonId,
        outcomeStatus:
          comparison.outcomeStatus,
        dimensions:
          runtime.clone(dimensions),
        baseConfidence:
          scored.baseConfidence,
        confounderPenalty:
          scored.confounderPenalty,
        missingEvidencePenalty:
          scored.missingPenalty,
        confidenceScore:
          scored.confidenceScore,
        confidenceBand:
          scored.confidenceBand,
        correlationId:
          handoff.data.correlationId,
        lineage:[
          ...handoff.data.lineage.map(runtime.clone),
          ...comparison.lineage.map(runtime.clone)
        ],
        ratedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.outcomeConfidenceStore.put(
        "ratings",
        rating
      );

      const reliability={
        outcomeReliabilityRatingId:
          runtime.createId("om_outcome_reliability"),
        outcomeConfidenceRatingId:
          rating.outcomeConfidenceRatingId,
        metricId:
          comparison.metricId,
        reliabilityScore:
          scored.reliabilityScore,
        reliabilityBand:
          scored.reliabilityBand,
        dimensions:{
          sourceReliability:
            dimensions.sourceReliability,
          sampleSufficiency:
            dimensions.sampleSufficiency,
          temporalCoverage:
            dimensions.temporalCoverage,
          evidenceCompleteness:
            dimensions.evidenceCompleteness
        },
        ratedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.outcomeConfidenceStore.put(
        "reliability",
        reliability
      );

      ratings.push(rating);
      reliabilityRatings.push(reliability);
    }

    const benefitHandoff={
      benefitRealizationHandoffId:
        runtime.createId("om_benefit_realization_handoff"),
      targetBlock:"OM-18",
      monitoringContractId:
        handoff.data.monitoringContractId,
      comparisons:
        handoff.data.comparisons.map(runtime.clone),
      interpretations:
        handoff.data.interpretations.map(runtime.clone),
      confidenceRatings:
        ratings.map(runtime.clone),
      reliabilityRatings:
        reliabilityRatings.map(runtime.clone),
      causationAssessments:
        handoff.data.causationAssessments.map(runtime.clone),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      confounders:
        handoff.data.confounders.map(runtime.clone),
      residualConfoundingScore:
        handoff.data.residualConfoundingScore,
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        ratings.length
          ? Number(
              (
                ratings.reduce(
                  (sum,item)=>sum+item.confidenceScore,
                  0
                ) / ratings.length
              ).toFixed(4)
            )
          : 0,
      reliability:
        reliabilityRatings.length
          ? Number(
              (
                reliabilityRatings.reduce(
                  (sum,item)=>sum+item.reliabilityScore,
                  0
                ) / reliabilityRatings.length
              ).toFixed(4)
            )
          : 0,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.outcomeConfidenceStore.put(
      "benefit_handoffs",
      benefitHandoff
    );

    await runtime.emit(
      "om.outcome_confidence.rated",
      {
        ratingCount:ratings.length,
        benefitRealizationHandoffId:
          benefitHandoff.benefitRealizationHandoffId
      }
    );

    return runtime.success({
      confidenceRatings:ratings,
      reliabilityRatings,
      benefitRealizationHandoff:benefitHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    rate,
    getConfidenceRating:({outcomeConfidenceRatingId}) =>
      global.INFINICUS.OM.outcomeConfidenceStore.get(
        "ratings",
        outcomeConfidenceRatingId
      ),
    getBenefitRealizationHandoff:({
      benefitRealizationHandoffId
    }) =>
      global.INFINICUS.OM.outcomeConfidenceStore.get(
        "benefit_handoffs",
        benefitRealizationHandoffId
      ),
    listConfidenceRatings:() =>
      global.INFINICUS.OM.outcomeConfidenceStore.list(
        "ratings"
      ),
    listReliabilityRatings:() =>
      global.INFINICUS.OM.outcomeConfidenceStore.list(
        "reliability"
      )
  });

  runtime.registerService(
    "om.outcome_confidence_reliability",
    api,
    {block:"OM-17"}
  );

  runtime.registerRoute(
    "om.outcome_confidence_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.outcome_confidence.rate",
    rate
  );

  global.INFINICUS.OM.outcomeConfidenceReliabilityEngine=api;
})(window);
