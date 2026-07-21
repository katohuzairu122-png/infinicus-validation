(function(global){
  "use strict";

  const runtime=global.INFINICUS.CL.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.CL.applicabilityPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.CL.applicabilityStore.put(
      "policies",
      built.data
    );
  }

  async function registerContext(input={}){
    if(!input.name || !input.contextType){
      return runtime.failure(
        "CL_CONTEXT_PROFILE_INVALID",
        "Context profile name and context type are required."
      );
    }

    const profile={
      learningContextProfileId:
        input.learningContextProfileId ||
        runtime.createId("cl_context_profile"),
      name:String(input.name),
      contextType:String(input.contextType),
      businessType:input.businessType || null,
      market:input.market || null,
      geography:input.geography || null,
      scale:input.scale || null,
      customerSegment:input.customerSegment || null,
      channel:input.channel || null,
      operatingModel:input.operatingModel || null,
      timeHorizon:input.timeHorizon || null,
      evidence:
        runtime.clone(input.evidence || []),
      confidence:
        Math.max(0,Math.min(1,Number(input.confidence ?? 0.5))),
      createdAt:new Date().toISOString()
    };

    return global.INFINICUS.CL.applicabilityStore.put(
      "contexts",
      profile
    );
  }

  async function assess({
    applicabilityScopeHandoffId,
    applicabilityPolicyId,
    sourceContextId,
    targetContextIds=[]
  }={}){
    const handoff=
      await global.INFINICUS.CL.lessonClassificationTaxonomyEngine
        .getApplicabilityScopeHandoff({
          applicabilityScopeHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.CL.applicabilityStore.get(
        "policies",
        applicabilityPolicyId
      );

    if(!policy.ok) return policy;

    const sourceContext=
      await global.INFINICUS.CL.applicabilityStore.get(
        "contexts",
        sourceContextId
      );

    if(!sourceContext.ok) return sourceContext;

    const targets=[];

    for(const targetContextId of targetContextIds){
      const target=
        await global.INFINICUS.CL.applicabilityStore.get(
          "contexts",
          targetContextId
        );

      if(!target.ok) return target;
      targets.push(target.data);
    }

    const assessments=[];
    const restrictions=[];

    for(const classification of handoff.data.classifications){
      for(const targetContext of targets){
        const scored=
          global.INFINICUS.CL.contextSimilarityScorer.score({
            sourceContext:sourceContext.data,
            targetContext,
            dimensions:policy.data.requiredDimensions
          });

        let transferability="out_of_scope";

        if(scored.similarity>=policy.data.minimumBroadTransferability){
          transferability="broad";
        }else if(
          scored.similarity>=policy.data.minimumConditionalTransferability
        ){
          transferability="conditional";
        }else if(
          scored.similarity>=policy.data.minimumRestrictedTransferability
        ){
          transferability="restricted";
        }

        const assessment={
          applicabilityAssessmentId:
            runtime.createId("cl_applicability_assessment"),
          outcomeLearningPackageId:
            handoff.data.outcomeLearningPackageId,
          lessonClassificationId:
            classification.lessonClassificationId,
          learningEvidenceId:
            classification.learningEvidenceId,
          sourceContextId:
            sourceContext.data.learningContextProfileId,
          targetContextId:
            targetContext.learningContextProfileId,
          similarityScore:
            scored.similarity,
          dimensionScores:
            runtime.clone(scored.components),
          transferability,
          declaredApplicabilityScope:
            handoff.data.declaredApplicabilityScope,
          confidence:
            Math.min(
              classification.confidence,
              sourceContext.data.confidence,
              targetContext.confidence,
              handoff.data.confidence
            ),
          reliability:
            Math.min(
              classification.reliability,
              handoff.data.reliability
            ),
          correlationId:
            handoff.data.correlationId,
          lineage:
            classification.lineage.map(runtime.clone),
          assessedAt:new Date().toISOString()
        };

        await global.INFINICUS.CL.applicabilityStore.put(
          "assessments",
          assessment
        );

        assessments.push(assessment);

        if(
          ["conditional","restricted","out_of_scope"].includes(
            transferability
          )
        ){
          const restriction={
            applicabilityRestrictionId:
              runtime.createId("cl_applicability_restriction"),
            applicabilityAssessmentId:
              assessment.applicabilityAssessmentId,
            lessonClassificationId:
              assessment.lessonClassificationId,
            targetContextId:
              assessment.targetContextId,
            restrictionType:transferability,
            reason:
              transferability==="out_of_scope"
                ? "Context similarity is below the minimum supported threshold."
                : "Learning may be applied only with explicit context constraints.",
            requiredConditions:
              Object.entries(scored.components)
                .filter(([,value])=>value<1)
                .map(([dimension])=>dimension),
            createdAt:new Date().toISOString()
          };

          await global.INFINICUS.CL.applicabilityStore.put(
            "restrictions",
            restriction
          );

          restrictions.push(restriction);
        }
      }
    }

    const confidenceHandoff={
      learningConfidenceHandoffId:
        runtime.createId("cl_learning_confidence_handoff"),
      targetBlock:"CL-06",
      learningPackageIntakeId:
        handoff.data.learningPackageIntakeId,
      outcomeLearningPackageId:
        handoff.data.outcomeLearningPackageId,
      outcomeVerdictId:
        handoff.data.outcomeVerdictId,
      classifications:
        handoff.data.classifications.map(runtime.clone),
      unclassifiedItems:
        handoff.data.unclassifiedItems.map(runtime.clone),
      applicabilityAssessments:
        assessments.map(runtime.clone),
      applicabilityRestrictions:
        restrictions.map(runtime.clone),
      learningEvidence:
        handoff.data.learningEvidence.map(runtime.clone),
      provenance:
        handoff.data.provenance.map(runtime.clone),
      limitations:
        handoff.data.limitations.map(runtime.clone),
      declaredApplicabilityScope:
        handoff.data.declaredApplicabilityScope,
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.CL.applicabilityStore.put(
      "handoffs",
      confidenceHandoff
    );

    await runtime.emit(
      "cl.applicability.assessed",
      {
        assessmentCount:assessments.length,
        restrictionCount:restrictions.length,
        learningConfidenceHandoffId:
          confidenceHandoff.learningConfidenceHandoffId
      }
    );

    return runtime.success({
      applicabilityAssessments:assessments,
      applicabilityRestrictions:restrictions,
      learningConfidenceHandoff:confidenceHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerContext,
    assess,
    getAssessment:({applicabilityAssessmentId}) =>
      global.INFINICUS.CL.applicabilityStore.get(
        "assessments",
        applicabilityAssessmentId
      ),
    getLearningConfidenceHandoff:({
      learningConfidenceHandoffId
    }) =>
      global.INFINICUS.CL.applicabilityStore.get(
        "handoffs",
        learningConfidenceHandoffId
      ),
    listAssessments:() =>
      global.INFINICUS.CL.applicabilityStore.list(
        "assessments"
      ),
    listRestrictions:() =>
      global.INFINICUS.CL.applicabilityStore.list(
        "restrictions"
      )
  });

  runtime.registerService(
    "cl.applicability_scope_context",
    api,
    {block:"CL-05"}
  );

  runtime.registerRoute(
    "cl.applicability_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "cl.context_profile.register",
    registerContext
  );

  runtime.registerRoute(
    "cl.applicability.assess",
    assess
  );

  global.INFINICUS.CL.applicabilityScopeContextEngine=api;
})(window);
