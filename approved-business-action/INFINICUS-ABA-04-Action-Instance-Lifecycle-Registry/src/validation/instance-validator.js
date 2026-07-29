(function (global) {
  "use strict";

  function validateCreate(handoff, input = {}) {
    const issues = [];

    if (!handoff.actionDefinitionId) {
      issues.push("Action definition ID is required.");
    }

    if (!handoff.businessId) {
      issues.push("Business ID is required.");
    }

    if (!handoff.actionTypeId || !handoff.target) {
      issues.push("Action type and target are required.");
    }

    if (
      input.expiresAt &&
      new Date(input.expiresAt).getTime() <= Date.now()
    ) {
      issues.push("Action instance expiry must be in the future.");
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  function validateTransitionInput({
    currentVersion,
    expectedVersion,
    toState,
    expiresAt,
    revokedAt
  }) {
    const issues = [];

    if (
      expectedVersion != null &&
      Number(expectedVersion) !== Number(currentVersion)
    ) {
      issues.push("Action instance version conflict.");
    }

    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
      if (!["expired", "cancelled"].includes(toState)) {
        issues.push("Expired action cannot transition to the requested state.");
      }
    }

    if (revokedAt && toState !== "revoked") {
      issues.push("Revoked action cannot transition to another state.");
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  global.INFINICUS.ABA.actionInstanceValidator =
    Object.freeze({ validateCreate, validateTransitionInput });
})(window);
