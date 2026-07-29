(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (
      !input.approvalPolicyId ||
      !input.name ||
      !input.workflowMode
    ) {
      return runtime.failure(
        "ABA_THRESHOLD_RULE_INVALID",
        "approvalPolicyId, name, and workflowMode are required."
      );
    }

    return runtime.success({
      thresholdRuleId:
        input.thresholdRuleId ||
        runtime.createId("aba_threshold_rule"),
      approvalPolicyId:
        String(input.approvalPolicyId),
      name:
        String(input.name),
      actionCategoryIds:
        runtime.clone(input.actionCategoryIds || []),
      actionTypeIds:
        runtime.clone(input.actionTypeIds || []),
      approvalClasses:
        runtime.clone(input.approvalClasses || []),
      minimumFinancialValue:
        input.minimumFinancialValue == null
          ? null
          : Number(input.minimumFinancialValue),
      maximumFinancialValue:
        input.maximumFinancialValue == null
          ? null
          : Number(input.maximumFinancialValue),
      currency:
        String(input.currency || "USD"),
      riskSeverities:
        runtime.clone(input.riskSeverities || []),
      reversibilityClasses:
        runtime.clone(input.reversibilityClasses || []),
      customerImpactLevels:
        runtime.clone(input.customerImpactLevels || []),
      workforceImpactLevels:
        runtime.clone(input.workforceImpactLevels || []),
      legalImpactLevels:
        runtime.clone(input.legalImpactLevels || []),
      dataSensitivityLevels:
        runtime.clone(input.dataSensitivityLevels || []),
      geographicScopeLevels:
        runtime.clone(input.geographicScopeLevels || []),
      businessCriticalityLevels:
        runtime.clone(input.businessCriticalityLevels || []),
      requiredApproverRoles:
        runtime.clone(input.requiredApproverRoles || []),
      requiredApprovalCount:
        Math.max(1, Number(input.requiredApprovalCount || 1)),
      workflowMode:
        String(input.workflowMode),
      unanimous:
        Boolean(input.unanimous),
      allowConditionalApproval:
        input.allowConditionalApproval !== false,
      escalationRoleIds:
        runtime.clone(input.escalationRoleIds || []),
      approvalDeadlineHours:
        Math.max(1, Number(input.approvalDeadlineHours || 24)),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.thresholdRuleModel =
    Object.freeze({ create });
})(window);
