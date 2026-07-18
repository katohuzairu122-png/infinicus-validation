(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerTemplate(input={}){
    const built =
      global.INFINICUS.ABA.actionContractTemplateModel
        .create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.actionContractStore.put(
      "templates",
      built.data
    );
  }

  async function generateContract({
    actionContractHandoffId,
    actionContractTemplateId,
    actionContext={},
    validityHours
  }={}){
    const handoff =
      await global.INFINICUS.ABA.approvalEvidenceAuditEngine
        .getActionContractHandoff({
          actionContractHandoffId
        });

    if(!handoff.ok) return handoff;

    if(handoff.data.status==="rejected"){
      return runtime.failure(
        "ABA_ACTION_CONTRACT_REJECTED",
        "Rejected approval evidence cannot generate an action contract."
      );
    }

    const evidencePackage =
      await global.INFINICUS.ABA.approvalEvidenceAuditEngine
        .getEvidencePackage({
          approvalEvidencePackageId:
            handoff.data.approvalEvidencePackageId
        });

    if(!evidencePackage.ok) return evidencePackage;

    const evidenceValidation =
      global.INFINICUS.ABA.actionContractValidator
        .validateEvidencePackage(evidencePackage.data);

    if(!evidenceValidation.valid){
      return runtime.failure(
        "ABA_APPROVAL_EVIDENCE_NOT_ELIGIBLE",
        "Approval evidence package cannot generate a contract.",
        evidenceValidation
      );
    }

    const template =
      await global.INFINICUS.ABA.actionContractStore.get(
        "templates",
        actionContractTemplateId
      );

    if(!template.ok) return template;

    const existing =
      await global.INFINICUS.ABA.actionContractStore
        .getByActionInstanceId(
          handoff.data.actionInstanceId
        );

    if(existing.ok){
      return runtime.success({
        actionContract:existing.data,
        idempotentReplay:true
      });
    }

    const issuedAt =
      new Date().toISOString();

    const hours =
      Math.max(
        1,
        Number(
          validityHours ||
          template.data.defaultValidityHours ||
          72
        )
      );

    const expiresAt =
      new Date(
        new Date(issuedAt).getTime() +
        hours * 3600000
      ).toISOString();

    const sections={
      identity:{
        actionInstanceId:
          handoff.data.actionInstanceId,
        approvalWorkflowId:
          handoff.data.approvalWorkflowId
      },
      approval:{
        approvalEvidencePackageId:
          evidencePackage.data.approvalEvidencePackageId,
        evidence:
          evidencePackage.data.evidence.map(runtime.clone),
        workflowOutcome:
          evidencePackage.data.workflowOutcome
      },
      target:
        runtime.clone(actionContext.target || {}),
      parameters:
        runtime.clone(actionContext.parameters || {}),
      conditions:
        evidencePackage.data.evidence
          .flatMap(item=>item.conditions || [])
          .map(runtime.clone),
      constraints:
        runtime.clone(actionContext.constraints || []),
      dependencies:
        runtime.clone(actionContext.dependencies || []),
      expected_outcomes:
        runtime.clone(actionContext.expectedOutcomes || []),
      rollback:
        runtime.clone(actionContext.rollbackConditions || []),
      monitoring:
        runtime.clone(actionContext.monitoringRequirements || [])
    };

    const contract={
      actionContractId:
        runtime.createId("aba_action_contract"),
      actionContractTemplateId,
      actionContractHandoffId,
      approvalEvidencePackageId:
        evidencePackage.data.approvalEvidencePackageId,
      approvalWorkflowId:
        handoff.data.approvalWorkflowId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      businessId:
        actionContext.businessId || null,
      twinId:
        actionContext.twinId || null,
      decisionId:
        actionContext.decisionId || null,
      recommendationId:
        actionContext.recommendationId || null,
      actionTypeId:
        actionContext.actionTypeId || null,
      actionTypeCode:
        actionContext.actionTypeCode || null,
      actionCategoryId:
        actionContext.actionCategoryId || null,
      target:
        runtime.clone(actionContext.target || {}),
      parameters:
        runtime.clone(actionContext.parameters || {}),
      constraints:
        runtime.clone(actionContext.constraints || []),
      dependencies:
        runtime.clone(actionContext.dependencies || []),
      expectedOutcomes:
        runtime.clone(actionContext.expectedOutcomes || []),
      rollbackConditions:
        runtime.clone(actionContext.rollbackConditions || []),
      monitoringRequirements:
        runtime.clone(actionContext.monitoringRequirements || []),
      executionConditions:
        runtime.clone(actionContext.executionConditions || []),
      approvalConditions:
        sections.conditions.map(runtime.clone),
      sections,
      version:
        1,
      status:
        "issued",
      issuedAt,
      expiresAt,
      revokedAt:
        null,
      correlationId:
        handoff.data.correlationId,
      causationId:
        handoff.data.causationId,
      lineage:
        runtime.clone(actionContext.lineage || []),
      confidence:
        Number(actionContext.confidence ?? 0)
    };

    const validation =
      global.INFINICUS.ABA.actionContractValidator
        .validateContract(
          contract,
          template.data
        );

    if(!validation.valid){
      return runtime.failure(
        "ABA_ACTION_CONTRACT_INVALID",
        "Generated action contract failed validation.",
        validation
      );
    }

    const contractBody =
      runtime.clone(contract);

    contract.contractChecksum =
      global.INFINICUS.ABA.actionContractChecksum
        .hash(contractBody);

    await global.INFINICUS.ABA.actionContractStore.put(
      "contracts",
      contract
    );

    await global.INFINICUS.ABA.actionContractStore.put(
      "versions",
      {
        actionContractVersionId:
          runtime.createId("aba_action_contract_version"),
        actionContractId:
          contract.actionContractId,
        version:
          contract.version,
        contractChecksum:
          contract.contractChecksum,
        contractSnapshot:
          runtime.clone(contract),
        createdAt:
          new Date().toISOString()
      }
    );

    const boundaryHandoff={
      actionBoundaryHandoffId:
        runtime.createId("aba_action_boundary_handoff"),
      targetBlock:
        "ABA-10",
      actionContractId:
        contract.actionContractId,
      contractChecksum:
        contract.contractChecksum,
      actionInstanceId:
        contract.actionInstanceId,
      businessId:
        contract.businessId,
      twinId:
        contract.twinId,
      decisionId:
        contract.decisionId,
      recommendationId:
        contract.recommendationId,
      actionTypeId:
        contract.actionTypeId,
      actionTypeCode:
        contract.actionTypeCode,
      actionCategoryId:
        contract.actionCategoryId,
      target:
        runtime.clone(contract.target),
      parameters:
        runtime.clone(contract.parameters),
      constraints:
        contract.constraints.map(runtime.clone),
      dependencies:
        contract.dependencies.map(runtime.clone),
      expectedOutcomes:
        contract.expectedOutcomes.map(runtime.clone),
      rollbackConditions:
        contract.rollbackConditions.map(runtime.clone),
      monitoringRequirements:
        contract.monitoringRequirements.map(runtime.clone),
      executionConditions:
        contract.executionConditions.map(runtime.clone),
      approvalConditions:
        contract.approvalConditions.map(runtime.clone),
      issuedAt:
        contract.issuedAt,
      expiresAt:
        contract.expiresAt,
      confidence:
        contract.confidence,
      lineage:
        contract.lineage.map(runtime.clone),
      correlationId:
        contract.correlationId,
      causationId:
        contract.causationId,
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionContractStore.put(
      "boundary_handoffs",
      boundaryHandoff
    );

    await runtime.emit(
      "aba.action_contract.issued",
      {
        actionContract:contract,
        actionBoundaryHandoffId:
          boundaryHandoff.actionBoundaryHandoffId
      }
    );

    return runtime.success({
      actionContract:contract,
      actionBoundaryHandoff:boundaryHandoff
    });
  }

  async function verifyContract({
    actionContractId
  }={}){
    const contract =
      await global.INFINICUS.ABA.actionContractStore.get(
        "contracts",
        actionContractId
      );

    if(!contract.ok) return contract;

    const body =
      runtime.clone(contract.data);

    const expected =
      body.contractChecksum;

    delete body.contractChecksum;

    const actual =
      global.INFINICUS.ABA.actionContractChecksum
        .hash(body);

    return runtime.success({
      valid:
        expected===actual,
      expectedChecksum:
        expected,
      calculatedChecksum:
        actual
    });
  }

  async function revokeContract({
    actionContractId,
    revokedBy,
    reason
  }={}){
    const contract =
      await global.INFINICUS.ABA.actionContractStore.get(
        "contracts",
        actionContractId
      );

    if(!contract.ok) return contract;

    const revocation={
      actionContractRevocationId:
        runtime.createId("aba_action_contract_revocation"),
      actionContractId,
      revokedBy:
        String(revokedBy || "unknown"),
      reason:
        String(reason || "Action contract revoked."),
      correlationId:
        contract.data.correlationId,
      createdAt:
        new Date().toISOString()
    };

    const updated={
      ...runtime.clone(contract.data),
      status:
        "revoked",
      revokedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionContractStore.put(
      "contracts",
      updated
    );

    await global.INFINICUS.ABA.actionContractStore.put(
      "revocations",
      revocation
    );

    await runtime.emit(
      "aba.action_contract.revoked",
      revocation
    );

    return runtime.success({
      actionContract:updated,
      revocation
    });
  }

  const api = Object.freeze({
    registerTemplate,
    generateContract,
    verifyContract,
    revokeContract,
    getActionContract:({actionContractId}) =>
      global.INFINICUS.ABA.actionContractStore.get(
        "contracts",
        actionContractId
      ),
    getActionBoundaryHandoff:({actionBoundaryHandoffId}) =>
      global.INFINICUS.ABA.actionContractStore.get(
        "boundary_handoffs",
        actionBoundaryHandoffId
      ),
    listContracts:() =>
      global.INFINICUS.ABA.actionContractStore.list(
        "contracts"
      )
  });

  runtime.registerService(
    "aba.approved_action_contract",
    api,
    {block:"ABA-09"}
  );

  runtime.registerRoute(
    "aba.action_contract_template.register",
    registerTemplate
  );

  runtime.registerRoute(
    "aba.action_contract.generate",
    generateContract
  );

  runtime.registerRoute(
    "aba.action_contract.verify",
    verifyContract
  );

  runtime.registerRoute(
    "aba.action_contract.revoke",
    revokeContract
  );

  runtime.registerBlock("ABA-09",{
    name:"Approved Action Contract Generation Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.approvedActionContractEngine =
    api;
})(window);
