(function (global) {
  "use strict";

  function includesOrOpen(values, value) {
    return !values.length || values.includes(value);
  }

  function inRange(value, minimum, maximum) {
    if (minimum != null && value < minimum) return false;
    if (maximum != null && value > maximum) return false;
    return true;
  }

  function matches(rule, action) {
    return (
      rule.status === "active" &&
      includesOrOpen(
        rule.actionCategoryIds,
        action.actionCategoryId
      ) &&
      includesOrOpen(
        rule.actionTypeIds,
        action.actionTypeId
      ) &&
      includesOrOpen(
        rule.approvalClasses,
        action.requiredApprovalClass
      ) &&
      inRange(
        Number(action.financialValue || 0),
        rule.minimumFinancialValue,
        rule.maximumFinancialValue
      ) &&
      (
        rule.minimumFinancialValue == null &&
        rule.maximumFinancialValue == null ||
        rule.currency === action.currency
      ) &&
      includesOrOpen(
        rule.riskSeverities,
        action.riskSeverity
      ) &&
      includesOrOpen(
        rule.reversibilityClasses,
        action.reversibility
      ) &&
      includesOrOpen(
        rule.customerImpactLevels,
        action.customerImpactLevel
      ) &&
      includesOrOpen(
        rule.workforceImpactLevels,
        action.workforceImpactLevel
      ) &&
      includesOrOpen(
        rule.legalImpactLevels,
        action.legalImpactLevel
      ) &&
      includesOrOpen(
        rule.dataSensitivityLevels,
        action.dataSensitivityLevel
      ) &&
      includesOrOpen(
        rule.geographicScopeLevels,
        action.geographicScopeLevel
      ) &&
      includesOrOpen(
        rule.businessCriticalityLevels,
        action.businessCriticalityLevel
      )
    );
  }

  function specificity(rule) {
    const arrays = [
      rule.actionCategoryIds,
      rule.actionTypeIds,
      rule.approvalClasses,
      rule.riskSeverities,
      rule.reversibilityClasses,
      rule.customerImpactLevels,
      rule.workforceImpactLevels,
      rule.legalImpactLevels,
      rule.dataSensitivityLevels,
      rule.geographicScopeLevels,
      rule.businessCriticalityLevels
    ];

    let score =
      arrays.reduce(
        (sum, values) =>
          sum + (values.length ? 1 : 0),
        0
      );

    if (rule.minimumFinancialValue != null) score += 1;
    if (rule.maximumFinancialValue != null) score += 1;

    return score;
  }

  function select(rules, action, policies) {
    const policyById =
      new Map(
        policies.map(item => [
          item.approvalPolicyId,
          item
        ])
      );

    return rules
      .filter(rule =>
        matches(rule, action)
      )
      .map(rule => ({
        rule,
        policy:
          policyById.get(rule.approvalPolicyId),
        specificity:
          specificity(rule)
      }))
      .filter(item =>
        item.policy &&
        item.policy.status === "active"
      )
      .sort((left, right) =>
        right.specificity - left.specificity ||
        right.policy.priority - left.policy.priority
      )[0] || null;
  }

  global.INFINICUS.ABA.approvalPolicyMatcher =
    Object.freeze({
      includesOrOpen,
      inRange,
      matches,
      specificity,
      select
    });
})(window);
