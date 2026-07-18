(function(global){
  "use strict";
  const runtime=global.INFINICUS.ABA.runtime;

  async function recordEvidence({
    approvalEvidenceHandoffId,
    signatures={}
  }={}){
    const handoff=await global.INFINICUS.ABA.multiStageApprovalWorkflowEngine
      .getApprovalEvidenceHandoff({approvalEvidenceHandoffId});
    if(!handoff.ok) return handoff;

    const validation=global.INFINICUS.ABA.approvalEvidenceValidator
      .validateHandoff(handoff.data);
    if(!validation.valid){
      return runtime.failure("ABA_APPROVAL_EVIDENCE_INVALID",
        "Approval evidence handoff failed validation.",validation);
    }

    const evidenceRecords=[];
    for(const task of handoff.data.tasks){
      const built=global.INFINICUS.ABA.approvalEvidenceModel.create({
        handoff:handoff.data,
        task,
        signature:signatures[task.approvalTaskId]
      });
      if(!built.ok) return built;
      const checksum=global.INFINICUS.ABA.approvalEvidenceChecksum.hash(built.data);
      const record={...built.data,evidenceChecksum:checksum};
      await global.INFINICUS.ABA.approvalEvidenceStore.put("evidence",record);
      evidenceRecords.push(record);

      const audit=global.INFINICUS.ABA.approvalAuditEventModel.create({
        eventType:"approval_evidence.recorded",
        subjectId:record.approvalEvidenceId,
        payload:{approvalTaskId:record.approvalTaskId,evidenceChecksum:checksum},
        correlationId:record.correlationId
      });
      await global.INFINICUS.ABA.approvalEvidenceStore.put("audits",audit.data);
    }

    const packageBody={
      approvalWorkflowId:handoff.data.approvalWorkflowId,
      actionInstanceId:handoff.data.actionInstanceId,
      workflowOutcome:handoff.data.workflowOutcome,
      evidence:evidenceRecords
    };

    const evidencePackage={
      approvalEvidencePackageId:runtime.createId("aba_approval_evidence_package"),
      approvalEvidenceHandoffId,
      approvalWorkflowId:handoff.data.approvalWorkflowId,
      actionInstanceId:handoff.data.actionInstanceId,
      workflowOutcome:handoff.data.workflowOutcome,
      evidence:evidenceRecords.map(runtime.clone),
      packageChecksum:global.INFINICUS.ABA.approvalEvidenceChecksum.hash(packageBody),
      correlationId:handoff.data.correlationId,
      causationId:handoff.data.causationId,
      status:"verified",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.approvalEvidenceStore.put("packages",evidencePackage);

    const contractHandoff={
      actionContractHandoffId:runtime.createId("aba_action_contract_handoff"),
      targetBlock:"ABA-09",
      approvalEvidencePackageId:evidencePackage.approvalEvidencePackageId,
      approvalWorkflowId:evidencePackage.approvalWorkflowId,
      actionInstanceId:evidencePackage.actionInstanceId,
      workflowOutcome:evidencePackage.workflowOutcome,
      approvalEvidence:evidencePackage.evidence.map(runtime.clone),
      packageChecksum:evidencePackage.packageChecksum,
      correlationId:evidencePackage.correlationId,
      causationId:evidencePackage.causationId,
      status:evidencePackage.workflowOutcome==="rejected"?"rejected":"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.approvalEvidenceStore.put(
      "contract_handoffs",contractHandoff
    );

    await runtime.emit("aba.approval_evidence.package_created",{
      evidencePackage,
      actionContractHandoffId:contractHandoff.actionContractHandoffId
    });

    return runtime.success({
      approvalEvidencePackage:evidencePackage,
      actionContractHandoff:contractHandoff
    });
  }

  async function verifyEvidence({approvalEvidenceId}={}){
    const record=await global.INFINICUS.ABA.approvalEvidenceStore.get(
      "evidence",approvalEvidenceId
    );
    if(!record.ok) return record;

    const body={...runtime.clone(record.data)};
    delete body.evidenceChecksum;

    const result=global.INFINICUS.ABA.approvalEvidenceValidator.verify(
      body,record.data.evidenceChecksum,global.INFINICUS.ABA.approvalEvidenceChecksum
    );

    const audit=global.INFINICUS.ABA.approvalAuditEventModel.create({
      eventType:"approval_evidence.verified",
      subjectId:approvalEvidenceId,
      payload:result,
      correlationId:record.data.correlationId
    });
    await global.INFINICUS.ABA.approvalEvidenceStore.put("audits",audit.data);

    return runtime.success(result);
  }

  async function revokeEvidence({
    approvalEvidencePackageId,
    revokedBy,
    reason
  }={}){
    const pkg=await global.INFINICUS.ABA.approvalEvidenceStore.get(
      "packages",approvalEvidencePackageId
    );
    if(!pkg.ok) return pkg;

    const revocation={
      approvalRevocationId:runtime.createId("aba_approval_revocation"),
      approvalEvidencePackageId,
      approvalWorkflowId:pkg.data.approvalWorkflowId,
      actionInstanceId:pkg.data.actionInstanceId,
      revokedBy:String(revokedBy||"unknown"),
      reason:String(reason||"Approval evidence revoked."),
      correlationId:pkg.data.correlationId,
      createdAt:new Date().toISOString()
    };
    await global.INFINICUS.ABA.approvalEvidenceStore.put("revocations",revocation);

    const updated={...runtime.clone(pkg.data),status:"revoked",revokedAt:new Date().toISOString()};
    await global.INFINICUS.ABA.approvalEvidenceStore.put("packages",updated);

    await runtime.emit("aba.approval_evidence.revoked",revocation);
    return runtime.success({approvalEvidencePackage:updated,revocation});
  }

  const api=Object.freeze({
    recordEvidence,
    verifyEvidence,
    revokeEvidence,
    getEvidencePackage:({approvalEvidencePackageId}) =>
      global.INFINICUS.ABA.approvalEvidenceStore.get("packages",approvalEvidencePackageId),
    getActionContractHandoff:({actionContractHandoffId}) =>
      global.INFINICUS.ABA.approvalEvidenceStore.get("contract_handoffs",actionContractHandoffId),
    listAuditEvents:() =>
      global.INFINICUS.ABA.approvalEvidenceStore.list("audits")
  });

  runtime.registerService("aba.approval_evidence_audit",api,{block:"ABA-08"});
  runtime.registerRoute("aba.approval_evidence.record",recordEvidence);
  runtime.registerRoute("aba.approval_evidence.verify",verifyEvidence);
  runtime.registerRoute("aba.approval_evidence.revoke",revokeEvidence);
  runtime.registerBlock("ABA-08",{
    name:"Approval Evidence, Signature and Audit Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.approvalEvidenceAuditEngine=api;
})(window);
