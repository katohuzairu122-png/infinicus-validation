(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;

  async function buildEvidencePackage({
    executionEvidenceHandoffId,
    executionContext={}
  }={}){
    const handoff=
      await global.INFINICUS.ABA.executionFailureRollbackEngine
        .getExecutionEvidenceHandoff({
          executionEvidenceHandoffId
        });

    if(!handoff.ok) return handoff;

    const validation=
      global.INFINICUS.ABA.executionEvidenceValidator
        .validateHandoff(handoff.data);

    if(!validation.valid){
      return runtime.failure(
        "ABA_EXECUTION_EVIDENCE_HANDOFF_INVALID",
        "Execution evidence handoff failed validation.",
        validation
      );
    }

    const sourceRecords=[
      ...handoff.data.completedResults.map(item=>({
        evidenceType:"execution_result",
        subjectId:
          item.controlledExecutionResultId ||
          item.executionAttemptId ||
          runtime.createId("aba_result_subject"),
        payload:item
      })),
      ...handoff.data.classifiedFailures.map(item=>({
        evidenceType:"execution_failure",
        subjectId:
          item.failure?.executionInvocationEnvelopeId ||
          runtime.createId("aba_failure_subject"),
        payload:item
      })),
      ...handoff.data.rollbackAttempts.map(item=>({
        evidenceType:"rollback_attempt",
        subjectId:
          item.rollbackAttemptId ||
          runtime.createId("aba_rollback_subject"),
        payload:item
      }))
    ];

    const evidence=[];

    for(const source of sourceRecords){
      const built=
        global.INFINICUS.ABA.executionEvidenceModel.create({
          ...source,
          actionInstanceId:
            executionContext.actionInstanceId || null,
          executionPlanId:
            handoff.data.executionPlanId,
          executionScheduleId:
            handoff.data.executionScheduleId,
          correlationId:
            handoff.data.correlationId
        });

      if(!built.ok) return built;

      const body=runtime.clone(built.data);
      const checksum=
        global.INFINICUS.ABA.executionEvidenceChecksum
          .hash(body);

      const record={
        ...built.data,
        evidenceChecksum:checksum
      };

      await global.INFINICUS.ABA.executionEvidenceStore.put(
        "evidence",
        record
      );

      const audit=
        global.INFINICUS.ABA.executionAuditEventModel.create({
          eventType:"execution_evidence.recorded",
          subjectId:record.executionEvidenceId,
          payload:{
            evidenceType:record.evidenceType,
            evidenceChecksum:checksum
          },
          correlationId:record.correlationId
        });

      await global.INFINICUS.ABA.executionEvidenceStore.put(
        "audits",
        audit.data
      );

      evidence.push(record);
    }

    const packageBody={
      executionEvidenceHandoffId,
      executionPlanId:
        handoff.data.executionPlanId,
      executionScheduleId:
        handoff.data.executionScheduleId,
      finalState:
        handoff.data.finalState,
      evidence
    };

    const evidencePackage={
      executionEvidencePackageId:
        runtime.createId("aba_execution_evidence_package"),
      executionEvidenceHandoffId,
      executionPlanId:
        handoff.data.executionPlanId,
      executionScheduleId:
        handoff.data.executionScheduleId,
      actionInstanceId:
        executionContext.actionInstanceId || null,
      finalState:
        handoff.data.finalState,
      evidence:
        evidence.map(runtime.clone),
      packageChecksum:
        global.INFINICUS.ABA.executionEvidenceChecksum
          .hash(packageBody),
      correlationId:
        handoff.data.correlationId,
      status:
        "verified",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionEvidenceStore.put(
      "packages",
      evidencePackage
    );

    const verificationHandoff={
      completionVerificationHandoffId:
        runtime.createId("aba_completion_verification_handoff"),
      targetBlock:"ABA-22",
      executionEvidencePackageId:
        evidencePackage.executionEvidencePackageId,
      executionPlanId:
        evidencePackage.executionPlanId,
      executionScheduleId:
        evidencePackage.executionScheduleId,
      actionInstanceId:
        evidencePackage.actionInstanceId,
      finalState:
        evidencePackage.finalState,
      evidence:
        evidencePackage.evidence.map(runtime.clone),
      packageChecksum:
        evidencePackage.packageChecksum,
      expectedOutcomes:
        runtime.clone(executionContext.expectedOutcomes || []),
      completionCriteria:
        runtime.clone(executionContext.completionCriteria || []),
      verificationCriteria:
        runtime.clone(executionContext.verificationCriteria || []),
      correlationId:
        evidencePackage.correlationId,
      lineage:
        runtime.clone(executionContext.lineage || []),
      confidence:
        Number(executionContext.confidence ?? 0),
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionEvidenceStore.put(
      "verification_handoffs",
      verificationHandoff
    );

    await runtime.emit(
      "aba.execution_evidence.package_created",
      {
        executionEvidencePackage:evidencePackage,
        completionVerificationHandoffId:
          verificationHandoff.completionVerificationHandoffId
      }
    );

    return runtime.success({
      executionEvidencePackage:evidencePackage,
      completionVerificationHandoff:verificationHandoff
    });
  }

  async function verifyEvidence({
    executionEvidenceId
  }={}){
    const evidence=
      await global.INFINICUS.ABA.executionEvidenceStore.get(
        "evidence",
        executionEvidenceId
      );

    if(!evidence.ok) return evidence;

    const body=runtime.clone(evidence.data);
    const expected=body.evidenceChecksum;
    delete body.evidenceChecksum;

    const result=
      global.INFINICUS.ABA.executionEvidenceValidator.verify(
        body,
        expected,
        global.INFINICUS.ABA.executionEvidenceChecksum
      );

    const audit=
      global.INFINICUS.ABA.executionAuditEventModel.create({
        eventType:"execution_evidence.verified",
        subjectId:executionEvidenceId,
        payload:result,
        correlationId:evidence.data.correlationId
      });

    await global.INFINICUS.ABA.executionEvidenceStore.put(
      "audits",
      audit.data
    );

    return runtime.success(result);
  }

  async function revokePackage({
    executionEvidencePackageId,
    revokedBy,
    reason
  }={}){
    const pkg=
      await global.INFINICUS.ABA.executionEvidenceStore.get(
        "packages",
        executionEvidencePackageId
      );

    if(!pkg.ok) return pkg;

    const revocation={
      executionEvidenceRevocationId:
        runtime.createId("aba_execution_evidence_revocation"),
      executionEvidencePackageId,
      revokedBy:String(revokedBy || "unknown"),
      reason:String(reason || "Execution evidence package revoked."),
      correlationId:pkg.data.correlationId,
      createdAt:new Date().toISOString()
    };

    const updated={
      ...runtime.clone(pkg.data),
      status:"revoked",
      revokedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionEvidenceStore.put(
      "packages",
      updated
    );

    await global.INFINICUS.ABA.executionEvidenceStore.put(
      "revocations",
      revocation
    );

    await runtime.emit(
      "aba.execution_evidence.revoked",
      revocation
    );

    return runtime.success({
      executionEvidencePackage:updated,
      revocation
    });
  }

  const api=Object.freeze({
    buildEvidencePackage,
    verifyEvidence,
    revokePackage,
    getEvidencePackage:({executionEvidencePackageId}) =>
      global.INFINICUS.ABA.executionEvidenceStore.get(
        "packages",
        executionEvidencePackageId
      ),
    getCompletionVerificationHandoff:({
      completionVerificationHandoffId
    }) =>
      global.INFINICUS.ABA.executionEvidenceStore.get(
        "verification_handoffs",
        completionVerificationHandoffId
      ),
    listAuditEvents:() =>
      global.INFINICUS.ABA.executionEvidenceStore.list(
        "audits"
      )
  });

  runtime.registerService(
    "aba.execution_evidence_audit",
    api,
    {block:"ABA-21"}
  );

  runtime.registerRoute(
    "aba.execution_evidence.build",
    buildEvidencePackage
  );

  runtime.registerRoute(
    "aba.execution_evidence.verify",
    verifyEvidence
  );

  runtime.registerRoute(
    "aba.execution_evidence.revoke",
    revokePackage
  );

  runtime.registerBlock("ABA-21",{
    name:"Execution Evidence and Audit Trail Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.executionEvidenceAuditEngine=
    api;
})(window);
