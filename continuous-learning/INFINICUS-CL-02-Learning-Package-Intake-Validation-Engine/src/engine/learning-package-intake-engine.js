(function(global){
  "use strict";

  const runtime=global.INFINICUS.CL.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.CL.learningIntakePolicyModel.create(
        input
      );

    if(!built.ok) return built;

    return global.INFINICUS.CL.learningIntakeStore.put(
      "policies",
      built.data
    );
  }

  async function intake({
    learningIntakePolicyId,
    publication
  }={}){
    const policy=
      await global.INFINICUS.CL.learningIntakeStore.get(
        "policies",
        learningIntakePolicyId
      );

    if(!policy.ok) return policy;

    const validation=
      global.INFINICUS.CL.learningPackageValidator.validate({
        publication,
        policy:policy.data
      });

    const idempotencyKey=
      publication?.learningPublicationId
        ? `cl_intake_${publication.learningPublicationId}`
        : null;

    if(idempotencyKey){
      const existing=
        await global.INFINICUS.CL.learningIntakeStore
          .getAcceptedByIdempotencyKey(idempotencyKey);

      if(existing.ok){
        return runtime.success({
          intake:existing.data,
          idempotentReplay:true
        });
      }
    }

    if(!validation.valid){
      const quarantine={
        learningPackageQuarantineId:
          runtime.createId("cl_learning_quarantine"),
        learningPublicationId:
          publication?.learningPublicationId || null,
        outcomeLearningPackageId:
          publication?.outcomeLearningPackageId || null,
        validationIssues:
          validation.issues.map(String),
        payload:
          runtime.clone(publication || {}),
        state:"quarantined",
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.CL.learningIntakeStore.put(
        "quarantine",
        quarantine
      );

      await runtime.emit(
        "cl.learning_package.quarantined",
        {
          learningPackageQuarantineId:
            quarantine.learningPackageQuarantineId,
          issueCount:
            quarantine.validationIssues.length
        }
      );

      return runtime.failure(
        "CL_LEARNING_PACKAGE_INVALID",
        "Learning package failed intake validation.",
        {
          quarantineId:
            quarantine.learningPackageQuarantineId,
          issues:
            quarantine.validationIssues
        }
      );
    }

    const intakeRecord={
      learningPackageIntakeId:
        runtime.createId("cl_learning_intake"),
      learningPublicationId:
        publication.learningPublicationId,
      learningPublicationReceiptId:
        publication.learningPublicationReceiptId,
      outcomeLearningPackageId:
        publication.outcomeLearningPackageId,
      outcomeVerdictId:
        publication.outcomeVerdictId,
      monitoringContractId:
        publication.monitoringContractId,
      packageVersion:
        publication.packageVersion,
      lessons:
        runtime.clone(publication.lessons),
      successFactors:
        runtime.clone(publication.successFactors),
      failureFactors:
        runtime.clone(publication.failureFactors),
      hypotheses:
        runtime.clone(publication.hypotheses),
      limitations:
        runtime.clone(publication.limitations),
      applicabilityScope:
        publication.applicabilityScope,
      decisionRuleFeedback:
        runtime.clone(publication.decisionRuleFeedback || []),
      modelCalibrationFeedback:
        runtime.clone(publication.modelCalibrationFeedback || []),
      dataQualityLearning:
        runtime.clone(publication.dataQualityLearning || []),
      operationalLearning:
        runtime.clone(publication.operationalLearning || []),
      riskLearning:
        runtime.clone(publication.riskLearning || []),
      confidence:
        Number(publication.confidence),
      reliability:
        Number(publication.reliability),
      correlationId:
        publication.correlationId,
      lineage:
        publication.lineage.map(runtime.clone),
      idempotencyKey,
      state:"accepted",
      acceptedAt:new Date().toISOString()
    };

    await global.INFINICUS.CL.learningIntakeStore.put(
      "accepted",
      intakeRecord
    );

    const learningState=
      runtime.registerLearningState({
        learningPackageId:
          intakeRecord.outcomeLearningPackageId,
        state:"accepted",
        confidence:
          intakeRecord.confidence,
        reliability:
          intakeRecord.reliability,
        correlationId:
          intakeRecord.correlationId
      });

    const evidenceHandoff={
      learningEvidenceHandoffId:
        runtime.createId("cl_learning_evidence_handoff"),
      targetBlock:"CL-03",
      learningPackageIntakeId:
        intakeRecord.learningPackageIntakeId,
      learningPublicationId:
        intakeRecord.learningPublicationId,
      learningPublicationReceiptId:
        intakeRecord.learningPublicationReceiptId,
      outcomeLearningPackageId:
        intakeRecord.outcomeLearningPackageId,
      outcomeVerdictId:
        intakeRecord.outcomeVerdictId,
      monitoringContractId:
        intakeRecord.monitoringContractId,
      lessons:
        intakeRecord.lessons.map(runtime.clone),
      successFactors:
        intakeRecord.successFactors.map(runtime.clone),
      failureFactors:
        intakeRecord.failureFactors.map(runtime.clone),
      hypotheses:
        intakeRecord.hypotheses.map(runtime.clone),
      limitations:
        intakeRecord.limitations.map(runtime.clone),
      applicabilityScope:
        intakeRecord.applicabilityScope,
      decisionRuleFeedback:
        intakeRecord.decisionRuleFeedback.map(runtime.clone),
      modelCalibrationFeedback:
        intakeRecord.modelCalibrationFeedback.map(runtime.clone),
      dataQualityLearning:
        intakeRecord.dataQualityLearning.map(runtime.clone),
      operationalLearning:
        intakeRecord.operationalLearning.map(runtime.clone),
      riskLearning:
        intakeRecord.riskLearning.map(runtime.clone),
      confidence:
        intakeRecord.confidence,
      reliability:
        intakeRecord.reliability,
      correlationId:
        intakeRecord.correlationId,
      lineage:
        intakeRecord.lineage.map(runtime.clone),
      learningStateId:
        learningState.data.learningStateId,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.CL.learningIntakeStore.put(
      "handoffs",
      evidenceHandoff
    );

    await runtime.emit(
      "cl.learning_package.accepted",
      {
        learningPackageIntakeId:
          intakeRecord.learningPackageIntakeId,
        learningEvidenceHandoffId:
          evidenceHandoff.learningEvidenceHandoffId
      }
    );

    return runtime.success({
      intake:intakeRecord,
      learningEvidenceHandoff:evidenceHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    intake,
    getAcceptedPackage:({learningPackageIntakeId}) =>
      global.INFINICUS.CL.learningIntakeStore.get(
        "accepted",
        learningPackageIntakeId
      ),
    getLearningEvidenceHandoff:({
      learningEvidenceHandoffId
    }) =>
      global.INFINICUS.CL.learningIntakeStore.get(
        "handoffs",
        learningEvidenceHandoffId
      ),
    listAcceptedPackages:() =>
      global.INFINICUS.CL.learningIntakeStore.list(
        "accepted"
      ),
    listQuarantinedPackages:() =>
      global.INFINICUS.CL.learningIntakeStore.list(
        "quarantine"
      )
  });

  runtime.registerService(
    "cl.learning_package_intake",
    api,
    {block:"CL-02"}
  );

  runtime.registerRoute(
    "cl.learning_intake_policy.register",
    registerPolicy,
    {block:"CL-02"}
  );

  runtime.registerRoute(
    "cl.learning_package.intake",
    intake,
    {block:"CL-02"}
  );

  global.INFINICUS.CL.learningPackageIntakeEngine=api;
})(window);
