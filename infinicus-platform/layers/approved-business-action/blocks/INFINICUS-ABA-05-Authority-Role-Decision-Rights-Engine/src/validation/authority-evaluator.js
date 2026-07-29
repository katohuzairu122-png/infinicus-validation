(function (global) {
  "use strict";

  function includesOrOpen(values, value) {
    return !values.length || values.includes(value);
  }

  function withinPeriod(record, now = Date.now()) {
    const from = record.validFrom
      ? new Date(record.validFrom).getTime()
      : -Infinity;

    const until = record.validUntil
      ? new Date(record.validUntil).getTime()
      : Infinity;

    return now >= from && now <= until;
  }

  function scopeMatches(scope, action) {
    return (
      includesOrOpen(scope.businessIds, action.businessId) &&
      includesOrOpen(scope.legalEntityIds, action.legalEntityId || null) &&
      includesOrOpen(scope.departmentIds, action.departmentId || null) &&
      includesOrOpen(scope.geographicCodes, action.geographicCode || null) &&
      includesOrOpen(scope.actionCategoryIds, action.actionCategoryId) &&
      includesOrOpen(scope.actionTypeIds, action.actionTypeId) &&
      includesOrOpen(
        scope.targetTypeIds,
        action.target?.targetTypeId || null
      )
    );
  }

  function evaluate({
    actor,
    role,
    decisionRight,
    scope,
    delegation,
    action,
    financialValue,
    currency,
    riskSeverity,
    conflicts = []
  }) {
    const issues = [];

    if (!actor?.actorId) {
      issues.push("Actor ID is required.");
    }

    if (!role || role.status !== "active") {
      issues.push("Actor role is not active.");
    }

    if (!decisionRight || decisionRight.status !== "active") {
      issues.push("Decision right is not active.");
    }

    if (!scope || scope.status !== "active") {
      issues.push("Authority scope is not active.");
    }

    if (decisionRight && !withinPeriod(decisionRight)) {
      issues.push("Decision right is outside its valid period.");
    }

    if (
      decisionRight &&
      decisionRight.approvalClass !== action.requiredApprovalClass
    ) {
      issues.push("Decision right approval class does not match action.");
    }

    if (scope && !scopeMatches(scope, action)) {
      issues.push("Authority scope does not cover the action.");
    }

    if (
      decisionRight?.maximumFinancialValue != null &&
      Number(financialValue || 0) >
        decisionRight.maximumFinancialValue
    ) {
      issues.push("Action value exceeds financial authority limit.");
    }

    if (
      decisionRight?.maximumFinancialValue != null &&
      currency !== decisionRight.currency
    ) {
      issues.push("Action currency does not match authority currency.");
    }

    if (
      decisionRight &&
      !decisionRight.allowedRiskSeverities.includes(riskSeverity)
    ) {
      issues.push("Risk severity is outside authority.");
    }

    if (
      decisionRight?.requiresNoConflict &&
      conflicts.some(item => item.status !== "resolved")
    ) {
      issues.push("Unresolved conflict of interest exists.");
    }

    if (delegation) {
      if (
        !decisionRight?.mayDelegate
      ) {
        issues.push("Decision right cannot be delegated.");
      }

      if (
        delegation.status !== "active" ||
        !withinPeriod(delegation)
      ) {
        issues.push("Delegation is not currently valid.");
      }

      if (
        delegation.delegateActorId !== actor.actorId
      ) {
        issues.push("Delegation does not belong to this actor.");
      }
    }

    return {
      eligible:
        issues.length === 0,
      issues
    };
  }

  global.INFINICUS.ABA.authorityEvaluator =
    Object.freeze({
      includesOrOpen,
      withinPeriod,
      scopeMatches,
      evaluate
    });
})(window);
