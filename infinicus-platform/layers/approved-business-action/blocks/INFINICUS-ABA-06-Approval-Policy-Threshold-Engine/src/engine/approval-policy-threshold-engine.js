(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerPolicy(input = {}) {
    const built =
      global.INFINICUS.ABA.approvalPolicyModel.create(input);

    if (!built.ok) return built;

    return global.INFINICUS.ABA.approvalPolicyStore.put(
      "policies",
      built.data
    );
  }

  async function registerThresholdRule(input = {}) {
    const policy =
      await global.INFINICUS.ABA.approvalPolicyStore.get(
        "policies",
        input.approvalPolicyId
      );

    if (!policy.ok) return policy;

    const built =
      global.INFINICUS.ABA.thresholdRuleModel.create(input);

    if (!built.ok) return built;

    return global.INFINICUS.ABA.approvalPolicyStore.put(
      "rules",
      built.data
    );
  }

  async function resolveRequirements({
    approvalPolicyHandoffId,
    customerImpactLevel = "low",
    workforceImpactLevel = "low",
    legalImpactLevel = "low",
    dataSensitivityLevel = "low",
    geographicScopeLevel = "local",
    businessCriticalityLevel = "standard"
  } = {}) {
    const handoff =
      await global.INFINICUS.ABA.authorityDecisionRightsEngine
        .getApprovalPolicyHandoff({ approvalPolicyHandoffId });

    if (!handoff.ok) return handoff;

    const policies =
      await global.INFINICUS.ABA.approvalPolicyStore.list(
        "policies"
      );

    if (!policies.ok) return policies;

    const rules =
      await global.INFINICUS.ABA.approvalPolicyStore.list(
        "rules"
      );

    if (!rules.ok) return rules;

    const actionContext = {
      ...runtime.clone(handoff.data),
      customerImpactLevel,
      workforceImpactLevel,
      legalImpactLevel,
      dataSensitivityLevel,
      geographicScopeLevel,
      businessCriticalityLevel
    };

    const selected =
      global.INFINICUS.ABA.approvalPolicyMatcher.select(
        rules.data,
        actionContext,
        policies.data
      );

    if (!selected) {
      return runtime.failure(
        "ABA_APPROVAL_POLICY_NOT_FOUND",
        "No approval policy applies to this action.",
        {
          actionInstanceId:
            handoff.data.actionInstanceId,
          actionContext
        }
      );
    }

    const resolution = {
      approvalRequirementResolutionId:
        runtime.createId(
          "aba_approval_requirement_resolution"
        ),
      approvalPolicyHandoffId,
      approvalPolicyId:
        selected.policy.approvalPolicyId,
      thresholdRuleId:
        selected.rule.thresholdRuleId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      businessId:
        handoff.data.businessId,
      actionTypeId:
        handoff.data.actionTypeId,
      actionCategoryId:
        handoff.data.actionCategoryId,
      requiredApprovalClass:
        handoff.data.requiredApprovalClass,
      eligibleAuthority:
        runtime.clone(handoff.data.eligibleAuthority),
      requiredApproverRoles:
        runtime.clone(
          selected.rule.requiredApproverRoles
        ),
      requiredApprovalCount:
        selected.rule.requiredApprovalCount,
      workflowMode:
        selected.rule.workflowMode,
      unanimous:
        selected.rule.unanimous,
      allowConditionalApproval:
        selected.rule.allowConditionalApproval,
      escalationRoleIds:
        runtime.clone(
          selected.rule.escalationRoleIds
        ),
      approvalDeadlineHours:
        selected.rule.approvalDeadlineHours,
      impactContext: {
        financialValue:
          handoff.data.financialValue,
        currency:
          handoff.data.currency,
        riskSeverity:
          handoff.data.riskSeverity,
        reversibility:
          handoff.data.reversibility,
        customerImpactLevel,
        workforceImpactLevel,
        legalImpactLevel,
        dataSensitivityLevel,
        geographicScopeLevel,
        businessCriticalityLevel
      },
      confidence:
        handoff.data.confidence,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      causationId:
        handoff.data.causationId,
      status:
        "resolved",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.approvalPolicyStore.put(
      "resolutions",
      resolution
    );

    const workflowHandoff = {
      approvalWorkflowHandoffId:
        runtime.createId("aba_approval_workflow_handoff"),
      targetBlock:
        "ABA-07",
      approvalRequirementResolutionId:
        resolution.approvalRequirementResolutionId,
      approvalPolicyId:
        resolution.approvalPolicyId,
      thresholdRuleId:
        resolution.thresholdRuleId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      actionDefinitionId:
        handoff.data.actionDefinitionId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      decisionId:
        handoff.data.decisionId,
      recommendationId:
        handoff.data.recommendationId,
      actionTypeId:
        handoff.data.actionTypeId,
      actionTypeCode:
        handoff.data.actionTypeCode,
      actionCategoryId:
        handoff.data.actionCategoryId,
      target:
        runtime.clone(handoff.data.target),
      parameters:
        runtime.clone(handoff.data.parameters),
      requiredApproverRoles:
        resolution.requiredApproverRoles.map(runtime.clone),
      requiredApprovalCount:
        resolution.requiredApprovalCount,
      workflowMode:
        resolution.workflowMode,
      unanimous:
        resolution.unanimous,
      allowConditionalApproval:
        resolution.allowConditionalApproval,
      escalationRoleIds:
        resolution.escalationRoleIds.map(runtime.clone),
      approvalDeadlineHours:
        resolution.approvalDeadlineHours,
      eligibleAuthority:
        runtime.clone(handoff.data.eligibleAuthority),
      constraints:
        handoff.data.constraints.map(runtime.clone),
      dependencies:
        handoff.data.dependencies.map(runtime.clone),
      riskEvidence:
        handoff.data.riskEvidence.map(runtime.clone),
      expectedOutcomes:
        handoff.data.expectedOutcomes.map(runtime.clone),
      impactContext:
        runtime.clone(resolution.impactContext),
      confidence:
        handoff.data.confidence,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      causationId:
        handoff.data.causationId,
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.approvalPolicyStore.put(
      "workflow_handoffs",
      workflowHandoff
    );

    await runtime.emit(
      "aba.approval_requirements.resolved",
      {
        resolution,
        approvalWorkflowHandoffId:
          workflowHandoff.approvalWorkflowHandoffId
      }
    );

    return runtime.success({
      approvalRequirementResolution:
        resolution,
      approvalWorkflowHandoff:
        workflowHandoff
    });
  }

  const api = Object.freeze({
    registerPolicy,
    registerThresholdRule,
    resolveRequirements,
    getApprovalRequirementResolution: ({
      approvalRequirementResolutionId
    }) =>
      global.INFINICUS.ABA.approvalPolicyStore.get(
        "resolutions",
        approvalRequirementResolutionId
      ),
    getApprovalWorkflowHandoff: ({
      approvalWorkflowHandoffId
    }) =>
      global.INFINICUS.ABA.approvalPolicyStore.get(
        "workflow_handoffs",
        approvalWorkflowHandoffId
      ),
    listPolicies: () =>
      global.INFINICUS.ABA.approvalPolicyStore.list(
        "policies"
      ),
    listThresholdRules: () =>
      global.INFINICUS.ABA.approvalPolicyStore.list(
        "rules"
      )
  });

  runtime.registerService(
    "aba.approval_policy_threshold",
    api,
    { block: "ABA-06" }
  );

  runtime.registerRoute(
    "aba.approval_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "aba.approval_threshold_rule.register",
    registerThresholdRule
  );

  runtime.registerRoute(
    "aba.approval_requirements.resolve",
    resolveRequirements
  );

  runtime.registerBlock("ABA-06", {
    name:
      "Approval Policy and Threshold Engine",
    version:
      "1.0.0",
    status:
      "active"
  });

  global.INFINICUS.ABA.approvalPolicyThresholdEngine =
    api;
})(window);
