(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.outcomeVerdictPolicyModel.create(
        input
      );

    if(!built.ok) return built;

    return global.INFINICUS.OM.outcomeVerdictStore.put(
      "policies",
      built.data
    );
  }

  async function evaluate({
    outcomeVerdictHandoffId,
    outcomeVerdictPolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.outcomeEvidenceAuditTrailEngine
        .getOutcomeVerdictHandoff({
          outcomeVerdictHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.outcomeVerdictStore.get(
        "policies",
        outcomeVerdictPolicyId
      );

    if(!policy.ok) return policy;

    const evaluated=
      global.INFINICUS.OM.outcomeVerdictEvaluator.evaluate({
        handoff:handoff.data,
        policy:policy.data
      });

    if(!evaluated.valid){
      return runtime.failure(
        "OM_OUTCOME_VERDICT_INVALID",
        "Outcome verdict evaluation failed.",
        evaluated
      );
    }

    const verdict={
      outcomeVerdictId:
        runtime.createId("om_outcome_verdict"),
      monitoringContractId:
        handoff.data.monitoringContractId,
      outcomeAuditPackageId:
        handoff.data.outcomeAuditPackageId,
      packageHash:
        handoff.data.packageHash,
      verdict:
        evaluated.verdict,
      rationale:
        runtime.clone(evaluated.reasons),
      evaluationMetrics:
        runtime.clone(evaluated.metrics),
      humanReviewRequired:
        evaluated.humanReviewRequired,
      reviewStatus:
        evaluated.humanReviewRequired
          ? "pending"
          : "not_required",
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      status:"issued",
      issuedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.outcomeVerdictStore.put(
      "verdicts",
      verdict
    );

    const learningHandoff={
      learningPackageHandoffId:
        runtime.createId("om_learning_package_handoff"),
      targetBlock:"OM-23",
      monitoringContractId:
        handoff.data.monitoringContractId,
      outcomeVerdictId:
        verdict.outcomeVerdictId,
      outcomeAuditPackageId:
        verdict.outcomeAuditPackageId,
      verdict:
        verdict.verdict,
      rationale:
        verdict.rationale.map(runtime.clone),
      evaluationMetrics:
        runtime.clone(verdict.evaluationMetrics),
      comparisons:
        handoff.data.comparisons.map(runtime.clone),
      confidenceRatings:
        handoff.data.confidenceRatings.map(runtime.clone),
      reliabilityRatings:
        handoff.data.reliabilityRatings.map(runtime.clone),
      benefitAssessments:
        handoff.data.benefitAssessments.map(runtime.clone),
      adverseOutcomes:
        handoff.data.adverseOutcomes.map(runtime.clone),
      monitoringExceptions:
        handoff.data.monitoringExceptions.map(runtime.clone),
      causationAssessments:
        handoff.data.causationAssessments.map(runtime.clone),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      status:
        verdict.humanReviewRequired
          ? "awaiting_review"
          : "ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.outcomeVerdictStore.put(
      "learning_handoffs",
      learningHandoff
    );

    await runtime.emit(
      "om.outcome_verdict.issued",
      {
        outcomeVerdictId:
          verdict.outcomeVerdictId,
        verdict:
          verdict.verdict,
        learningPackageHandoffId:
          learningHandoff.learningPackageHandoffId
      }
    );

    return runtime.success({
      outcomeVerdict:verdict,
      learningPackageHandoff:learningHandoff
    });
  }

  async function review({
    outcomeVerdictId,
    reviewedBy,
    decision,
    note=null
  }={}){
    const verdict=
      await global.INFINICUS.OM.outcomeVerdictStore.get(
        "verdicts",
        outcomeVerdictId
      );

    if(!verdict.ok) return verdict;

    if(!verdict.data.humanReviewRequired){
      return runtime.failure(
        "OM_VERDICT_REVIEW_NOT_REQUIRED",
        "This verdict does not require human review."
      );
    }

    if(!["approved","rejected","revised"].includes(decision)){
      return runtime.failure(
        "OM_VERDICT_REVIEW_DECISION_INVALID",
        "Review decision is invalid."
      );
    }

    const review={
      outcomeVerdictReviewId:
        runtime.createId("om_verdict_review"),
      outcomeVerdictId,
      reviewedBy:String(reviewedBy || "unknown"),
      decision,
      note,
      reviewedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.outcomeVerdictStore.put(
      "reviews",
      review
    );

    const updated={
      ...verdict.data,
      reviewStatus:decision,
      reviewedAt:review.reviewedAt
    };

    await global.INFINICUS.OM.outcomeVerdictStore.put(
      "verdicts",
      updated
    );

    return runtime.success({
      outcomeVerdict:updated,
      review
    });
  }

  const api=Object.freeze({
    registerPolicy,
    evaluate,
    review,
    getVerdict:({outcomeVerdictId}) =>
      global.INFINICUS.OM.outcomeVerdictStore.get(
        "verdicts",
        outcomeVerdictId
      ),
    getLearningPackageHandoff:({
      learningPackageHandoffId
    }) =>
      global.INFINICUS.OM.outcomeVerdictStore.get(
        "learning_handoffs",
        learningPackageHandoffId
      ),
    listVerdicts:() =>
      global.INFINICUS.OM.outcomeVerdictStore.list(
        "verdicts"
      )
  });

  runtime.registerService(
    "om.outcome_evaluation_verdict",
    api,
    {block:"OM-22"}
  );

  runtime.registerRoute(
    "om.outcome_verdict_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.outcome_verdict.evaluate",
    evaluate
  );

  runtime.registerRoute(
    "om.outcome_verdict.review",
    review
  );

  global.INFINICUS.OM.outcomeEvaluationVerdictEngine=api;
})(window);
