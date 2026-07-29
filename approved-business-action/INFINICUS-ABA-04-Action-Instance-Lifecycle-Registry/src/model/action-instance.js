(function (global) {
  "use strict";

  function create(handoff, input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    return runtime.success({
      actionInstanceId:
        input.actionInstanceId || runtime.createId("aba_action_instance"),
      actionDefinitionId: handoff.actionDefinitionId,
      businessId: handoff.businessId,
      twinId: handoff.twinId,
      simulationRunId: handoff.simulationRunId,
      scenarioId: handoff.scenarioId,
      decisionId: handoff.decisionId,
      recommendationId: handoff.recommendationId,
      actionTypeId: handoff.actionTypeId,
      actionTypeCode: handoff.actionTypeCode,
      actionCategoryId: handoff.actionCategoryId,
      target: runtime.clone(handoff.target),
      parameters: runtime.clone(handoff.parameters),
      reversibility: handoff.reversibility,
      requiredApprovalClass: handoff.requiredApprovalClass,
      requiredMonitoring: runtime.clone(handoff.requiredMonitoring),
      supportedAdapterCodes: runtime.clone(handoff.supportedAdapterCodes),
      constraints: handoff.constraints.map(runtime.clone),
      dependencies: handoff.dependencies.map(runtime.clone),
      expectedOutcomes: handoff.expectedOutcomes.map(runtime.clone),
      riskEvidence: handoff.riskEvidence.map(runtime.clone),
      simulationEvidence: runtime.clone(handoff.simulationEvidence),
      confidence: handoff.confidence,
      lineage: handoff.lineage.map(runtime.clone),
      correlationId: handoff.correlationId,
      causationId: handoff.causationId,
      lifecycleName: "approved_business_action",
      state: "draft",
      version: 1,
      expiresAt: input.expiresAt || null,
      revokedAt: null,
      blockedReason: null,
      createdBy: input.createdBy || "system",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.actionInstanceModel =
    Object.freeze({ create });
})(window);
