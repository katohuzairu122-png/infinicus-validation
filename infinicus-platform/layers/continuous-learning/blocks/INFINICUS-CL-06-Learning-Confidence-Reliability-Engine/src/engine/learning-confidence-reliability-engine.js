(function(global){
  "use strict";

  const runtime=global.INFINICUS.CL.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.CL.learningConfidencePolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.CL.learningConfidenceStore.put(
      "policies",
      built.data
    );
  }

  async function rate({
    learningConfidenceHandoffId,
    learningConfidencePolicyId
  }={}){
    const handoff=
      await global.INFINICUS.CL.applicabilityScopeContextEngine
        .getLearningConfidenceHandoff({
          learningConfidenceHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.CL.learningConfidenceStore.get(
        "policies",
        learningConfidencePolicyId
      );

    if(!policy.ok) return policy;

    const ratings=[];
    const reliabilityRatings=[];

    for(const evidence of handoff.data.learningEvidence){
      const classification=
        handoff.data.classifications.find(
          item=>item.learningEvidenceId===evidence.learningEvidenceId
        );

      const applicability=
        handoff.data.applicabilityAssessments.filter(
          item=>item.learningEvidenceId===evidence.learningEvidenceId
        );

      const restrictions=
        handoff.data.applicabilityRestrictions.filter(
          restriction=>
            applicability.some(
              item=>
                item.applicabilityAssessmentId===
                restriction.applicabilityAssessmentId
            )
        );

      const provenance=
        handoff.data.provenance.filter(
          item=>item.learningEvidenceId===evidence.learningEvidenceId
        );

      const unclassified=
        handoff.data.unclassifiedItems.some(
          item=>item.learningEvidenceId===evidence.learningEvidenceId
        );

      const applicabilityConfidence=
        applicability.length
          ? applicability.reduce(
              (sum,item)=>sum+item.confidence,
              0
            ) / applicability.length
          : 0;

      const provenanceCompleteness=
        provenance.length>0 ? 1 : 0;

      const lineageCompleteness=
        Array.isArray(evidence.lineage) &&
        evidence.lineage.length
          ? 1
          : 0;

      const dimensions={
        evidenceConfidence:
          evidence.confidence,
        evidenceReliability:
          evidence.reliability,
        classificationConfidence:
          classification?.classificationConfidence || 0,
        applicabilityConfidence,
        provenanceCompleteness,
        lineageCompleteness
      };

      const scored=
        global.INFINICUS.CL.learningConfidenceScorer.score({
          dimensions,
          limitationCount:
            handoff.data.limitations.length,
          restrictionCount:
            restrictions.length,
          unclassified,
          policy:policy.data
        });

      const rating={
        learningConfidenceRatingId:
          runtime.createId("cl_learning_confidence"),
        outcomeLearningPackageId:
          handoff.data.outcomeLearningPackageId,
        learningEvidenceId:
          evidence.learningEvidenceId,
        lessonClassificationId:
          classification?.lessonClassificationId || null,
        dimensions:
          runtime.clone(dimensions),
        baseConfidence:
          scored.baseConfidence,
        penalties:
          runtime.clone(scored.penalties),
        totalPenalty:
          scored.totalPenalty,
        confidenceScore:
          scored.confidenceScore,
        confidenceBand:
          scored.confidenceBand,
        eligibility:
          scored.eligibility,
        correlationId:
          handoff.data.correlationId,
        lineage:
          evidence.lineage.map(runtime.clone),
        ratedAt:new Date().toISOString()
      };

      await global.INFINICUS.CL.learningConfidenceStore.put(
        "ratings",
        rating
      );

      const reliability={
        learningReliabilityRatingId:
          runtime.createId("cl_learning_reliability"),
        learningConfidenceRatingId:
          rating.learningConfidenceRatingId,
        learningEvidenceId:
          evidence.learningEvidenceId,
        reliabilityScore:
          scored.reliabilityScore,
        reliabilityBand:
          scored.reliabilityBand,
        provenanceCompleteness,
        lineageCompleteness,
        ratedAt:new Date().toISOString()
      };

      await global.INFINICUS.CL.learningConfidenceStore.put(
        "reliability",
        reliability
      );

      ratings.push(rating);
      reliabilityRatings.push(reliability);
    }

    const conflictHandoff={
      learningConflictHandoffId:
        runtime.createId("cl_learning_conflict_handoff"),
      targetBlock:"CL-07",
      learningPackageIntakeId:
        handoff.data.learningPackageIntakeId,
      outcomeLearningPackageId:
        handoff.data.outcomeLearningPackageId,
      outcomeVerdictId:
        handoff.data.outcomeVerdictId,
      learningEvidence:
        handoff.data.learningEvidence.map(runtime.clone),
      provenance:
        handoff.data.provenance.map(runtime.clone),
      classifications:
        handoff.data.classifications.map(runtime.clone),
      applicabilityAssessments:
        handoff.data.applicabilityAssessments.map(runtime.clone),
      applicabilityRestrictions:
        handoff.data.applicabilityRestrictions.map(runtime.clone),
      confidenceRatings:
        ratings.map(runtime.clone),
      reliabilityRatings:
        reliabilityRatings.map(runtime.clone),
      limitations:
        handoff.data.limitations.map(runtime.clone),
      declaredApplicabilityScope:
        handoff.data.declaredApplicabilityScope,
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
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.CL.learningConfidenceStore.put(
      "handoffs",
      conflictHandoff
    );

    await runtime.emit(
      "cl.learning_confidence.rated",
      {
        ratingCount:ratings.length,
        learningConflictHandoffId:
          conflictHandoff.learningConflictHandoffId
      }
    );

    return runtime.success({
      confidenceRatings:ratings,
      reliabilityRatings,
      learningConflictHandoff:conflictHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    rate,
    getConfidenceRating:({learningConfidenceRatingId}) =>
      global.INFINICUS.CL.learningConfidenceStore.get(
        "ratings",
        learningConfidenceRatingId
      ),
    getLearningConflictHandoff:({
      learningConflictHandoffId
    }) =>
      global.INFINICUS.CL.learningConfidenceStore.get(
        "handoffs",
        learningConflictHandoffId
      ),
    listConfidenceRatings:() =>
      global.INFINICUS.CL.learningConfidenceStore.list(
        "ratings"
      ),
    listReliabilityRatings:() =>
      global.INFINICUS.CL.learningConfidenceStore.list(
        "reliability"
      )
  });

  runtime.registerService(
    "cl.learning_confidence_reliability",
    api,
    {block:"CL-06"}
  );

  runtime.registerRoute(
    "cl.learning_confidence_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "cl.learning_confidence.rate",
    rate
  );

  global.INFINICUS.CL.learningConfidenceReliabilityEngine=api;
})(window);
