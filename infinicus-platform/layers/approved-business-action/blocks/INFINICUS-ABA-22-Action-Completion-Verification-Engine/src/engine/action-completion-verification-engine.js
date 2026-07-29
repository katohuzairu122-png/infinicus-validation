(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.ABA.actionCompletionPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.actionCompletionStore.put(
      "policies",
      built.data
    );
  }

  async function verifyCompletion({
    completionVerificationHandoffId,
    actionCompletionPolicyId,
    manualVerification=null
  }={}){
    const handoff=
      await global.INFINICUS.ABA.executionEvidenceAuditEngine
        .getCompletionVerificationHandoff({
          completionVerificationHandoffId
        });

    if(!handoff.ok) return handoff;

    const evidencePackage=
      await global.INFINICUS.ABA.executionEvidenceAuditEngine
        .getEvidencePackage({
          executionEvidencePackageId:
            handoff.data.executionEvidencePackageId
        });

    if(!evidencePackage.ok) return evidencePackage;

    if(evidencePackage.data.status!=="verified"){
      return runtime.failure(
        "ABA_EXECUTION_EVIDENCE_NOT_VERIFIED",
        "Execution evidence package is not verified."
      );
    }

    const policy=
      await global.INFINICUS.ABA.actionCompletionStore.get(
        "policies",
        actionCompletionPolicyId
      );

    if(!policy.ok) return policy;

    const evaluation=
      global.INFINICUS.ABA.actionCompletionEvaluator.evaluate({
        evidencePackage:evidencePackage.data,
        completionCriteria:
          handoff.data.completionCriteria || [],
        verificationCriteria:
          handoff.data.verificationCriteria || [],
        policy:policy.data,
        manualVerification
      });

    const verification={
      actionCompletionVerificationId:
        runtime.createId("aba_action_completion_verification"),
      completionVerificationHandoffId,
      actionCompletionPolicyId,
      executionEvidencePackageId:
        evidencePackage.data.executionEvidencePackageId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      executionPlanId:
        handoff.data.executionPlanId,
      executionScheduleId:
        handoff.data.executionScheduleId,
      state:
        evaluation.state,
      evidenceSufficient:
        evaluation.evidenceSufficient,
      completionResults:
        evaluation.completionResults.map(runtime.clone),
      verificationResults:
        evaluation.verificationResults.map(runtime.clone),
      manualVerification:
        runtime.clone(evaluation.manualVerification),
      correlationId:
        handoff.data.correlationId,
      verifiedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionCompletionStore.put(
      "verifications",
      verification
    );

    if(
      !["verified","partially_completed"].includes(
        verification.state
      )
    ){
      const exception={
        completionVerificationExceptionId:
          runtime.createId("aba_completion_verification_exception"),
        actionCompletionVerificationId:
          verification.actionCompletionVerificationId,
        state:
          verification.state,
        evidenceSufficient:
          verification.evidenceSufficient,
        completionResults:
          verification.completionResults.map(runtime.clone),
        verificationResults:
          verification.verificationResults.map(runtime.clone),
        correlationId:
          verification.correlationId,
        createdAt:
          new Date().toISOString()
      };

      await global.INFINICUS.ABA.actionCompletionStore.put(
        "exceptions",
        exception
      );

      return runtime.failure(
        "ABA_ACTION_COMPLETION_NOT_VERIFIED",
        "Action completion could not be verified.",
        {
          verification,
          exception
        }
      );
    }

    const certificate={
      actionCompletionCertificateId:
        runtime.createId("aba_action_completion_certificate"),
      actionCompletionVerificationId:
        verification.actionCompletionVerificationId,
      actionInstanceId:
        verification.actionInstanceId,
      executionPlanId:
        verification.executionPlanId,
      executionEvidencePackageId:
        verification.executionEvidencePackageId,
      completionState:
        verification.state,
      evidenceSufficient:
        verification.evidenceSufficient,
      correlationId:
        verification.correlationId,
      issuedAt:
        new Date().toISOString(),
      status:
        "issued"
    };

    await global.INFINICUS.ABA.actionCompletionStore.put(
      "certificates",
      certificate
    );

    const outcomeHandoff={
      outcomeMonitoringHandoffId:
        runtime.createId("aba_outcome_monitoring_handoff"),
      targetBlock:"ABA-23",
      actionCompletionCertificateId:
        certificate.actionCompletionCertificateId,
      actionCompletionVerificationId:
        verification.actionCompletionVerificationId,
      executionEvidencePackageId:
        verification.executionEvidencePackageId,
      actionInstanceId:
        verification.actionInstanceId,
      executionPlanId:
        verification.executionPlanId,
      executionScheduleId:
        verification.executionScheduleId,
      completionState:
        verification.state,
      expectedOutcomes:
        handoff.data.expectedOutcomes.map(runtime.clone),
      completionResults:
        verification.completionResults.map(runtime.clone),
      verificationResults:
        verification.verificationResults.map(runtime.clone),
      correlationId:
        verification.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionCompletionStore.put(
      "outcome_handoffs",
      outcomeHandoff
    );

    await runtime.emit(
      "aba.action_completion.verified",
      {
        verification,
        certificate,
        outcomeMonitoringHandoffId:
          outcomeHandoff.outcomeMonitoringHandoffId
      }
    );

    return runtime.success({
      actionCompletionVerification:verification,
      actionCompletionCertificate:certificate,
      outcomeMonitoringHandoff:outcomeHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    verifyCompletion,
    getCompletionVerification:({
      actionCompletionVerificationId
    }) =>
      global.INFINICUS.ABA.actionCompletionStore.get(
        "verifications",
        actionCompletionVerificationId
      ),
    getCompletionCertificate:({
      actionCompletionCertificateId
    }) =>
      global.INFINICUS.ABA.actionCompletionStore.get(
        "certificates",
        actionCompletionCertificateId
      ),
    getOutcomeMonitoringHandoff:({
      outcomeMonitoringHandoffId
    }) =>
      global.INFINICUS.ABA.actionCompletionStore.get(
        "outcome_handoffs",
        outcomeMonitoringHandoffId
      ),
    listExceptions:() =>
      global.INFINICUS.ABA.actionCompletionStore.list(
        "exceptions"
      )
  });

  runtime.registerService(
    "aba.action_completion_verification",
    api,
    {block:"ABA-22"}
  );

  runtime.registerRoute(
    "aba.action_completion_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "aba.action_completion.verify",
    verifyCompletion
  );

  runtime.registerBlock("ABA-22",{
    name:"Action Completion and Verification Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.actionCompletionVerificationEngine=
    api;
})(window);
