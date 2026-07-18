(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.learningPackagePolicyModel.create(
        input
      );

    if(!built.ok) return built;

    return global.INFINICUS.OM.learningPackageStore.put(
      "policies",
      built.data
    );
  }

  async function generate({
    learningPackageHandoffId,
    learningPackagePolicyId,
    learningContext={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.outcomeEvaluationVerdictEngine
        .getLearningPackageHandoff({
          learningPackageHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.learningPackageStore.get(
        "policies",
        learningPackagePolicyId
      );

    if(!policy.ok) return policy;

    const extracted=
      global.INFINICUS.OM.lessonExtractor.extract({
        handoff:handoff.data,
        policy:policy.data,
        context:learningContext
      });

    if(
      policy.data.requireLimitations &&
      !Array.isArray(extracted.limitations)
    ){
      return runtime.failure(
        "OM_LEARNING_LIMITATIONS_REQUIRED",
        "Learning package limitations are required."
      );
    }

    if(
      policy.data.requireApplicabilityScope &&
      !extracted.applicabilityScope
    ){
      return runtime.failure(
        "OM_LEARNING_SCOPE_REQUIRED",
        "Learning applicability scope is required."
      );
    }

    const learningPackage={
      outcomeLearningPackageId:
        runtime.createId("om_learning_package"),
      monitoringContractId:
        handoff.data.monitoringContractId,
      outcomeVerdictId:
        handoff.data.outcomeVerdictId,
      outcomeAuditPackageId:
        handoff.data.outcomeAuditPackageId,
      verdict:
        handoff.data.verdict,
      rationale:
        handoff.data.rationale.map(runtime.clone),
      lessons:
        extracted.lessons.map(runtime.clone),
      successFactors:
        extracted.successFactors.map(runtime.clone),
      failureFactors:
        extracted.failureFactors.map(runtime.clone),
      hypotheses:
        extracted.hypotheses.map(runtime.clone),
      limitations:
        extracted.limitations.map(String),
      applicabilityScope:
        extracted.applicabilityScope,
      decisionRuleFeedback:
        runtime.clone(
          learningContext.decisionRuleFeedback || []
        ),
      modelCalibrationFeedback:
        runtime.clone(
          learningContext.modelCalibrationFeedback || []
        ),
      dataQualityLearning:
        runtime.clone(
          learningContext.dataQualityLearning || []
        ),
      operationalLearning:
        runtime.clone(
          learningContext.operationalLearning || []
        ),
      riskLearning:
        runtime.clone(
          learningContext.riskLearning || []
        ),
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      status:"generated",
      generatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.learningPackageStore.put(
      "packages",
      learningPackage
    );

    for(const item of learningPackage.lessons){
      await global.INFINICUS.OM.learningPackageStore.put(
        "items",
        {
          learningItemRecordId:
            runtime.createId("om_learning_item"),
          outcomeLearningPackageId:
            learningPackage.outcomeLearningPackageId,
          item:runtime.clone(item),
          createdAt:new Date().toISOString()
        }
      );
    }

    const publicationHandoff={
      learningPublicationHandoffId:
        runtime.createId("om_learning_publication_handoff"),
      targetBlock:"OM-24",
      monitoringContractId:
        handoff.data.monitoringContractId,
      outcomeLearningPackageId:
        learningPackage.outcomeLearningPackageId,
      outcomeVerdictId:
        handoff.data.outcomeVerdictId,
      verdict:
        learningPackage.verdict,
      lessons:
        learningPackage.lessons.map(runtime.clone),
      successFactors:
        learningPackage.successFactors.map(runtime.clone),
      failureFactors:
        learningPackage.failureFactors.map(runtime.clone),
      hypotheses:
        learningPackage.hypotheses.map(runtime.clone),
      limitations:
        learningPackage.limitations.map(String),
      applicabilityScope:
        learningPackage.applicabilityScope,
      decisionRuleFeedback:
        learningPackage.decisionRuleFeedback.map(runtime.clone),
      modelCalibrationFeedback:
        learningPackage.modelCalibrationFeedback.map(runtime.clone),
      dataQualityLearning:
        learningPackage.dataQualityLearning.map(runtime.clone),
      operationalLearning:
        learningPackage.operationalLearning.map(runtime.clone),
      riskLearning:
        learningPackage.riskLearning.map(runtime.clone),
      correlationId:
        learningPackage.correlationId,
      lineage:
        learningPackage.lineage.map(runtime.clone),
      confidence:
        learningPackage.confidence,
      reliability:
        learningPackage.reliability,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.learningPackageStore.put(
      "publication_handoffs",
      publicationHandoff
    );

    await runtime.emit(
      "om.learning_package.generated",
      {
        outcomeLearningPackageId:
          learningPackage.outcomeLearningPackageId,
        learningPublicationHandoffId:
          publicationHandoff.learningPublicationHandoffId
      }
    );

    return runtime.success({
      learningPackage,
      learningPublicationHandoff:publicationHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    generate,
    getLearningPackage:({
      outcomeLearningPackageId
    }) =>
      global.INFINICUS.OM.learningPackageStore.get(
        "packages",
        outcomeLearningPackageId
      ),
    getLearningPublicationHandoff:({
      learningPublicationHandoffId
    }) =>
      global.INFINICUS.OM.learningPackageStore.get(
        "publication_handoffs",
        learningPublicationHandoffId
      ),
    listLearningPackages:() =>
      global.INFINICUS.OM.learningPackageStore.list(
        "packages"
      )
  });

  runtime.registerService(
    "om.learning_package_generation",
    api,
    {block:"OM-23"}
  );

  runtime.registerRoute(
    "om.learning_package_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.learning_package.generate",
    generate
  );

  global.INFINICUS.OM.learningPackageGenerationEngine=api;
})(window);
