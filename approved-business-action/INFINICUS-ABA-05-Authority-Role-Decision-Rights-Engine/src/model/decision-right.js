(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (
      !input.roleId ||
      !input.authorityScopeId ||
      !input.approvalClass
    ) {
      return runtime.failure(
        "ABA_DECISION_RIGHT_INVALID",
        "roleId, authorityScopeId, and approvalClass are required."
      );
    }

    return runtime.success({
      decisionRightId:
        input.decisionRightId ||
        runtime.createId("aba_decision_right"),
      roleId:
        String(input.roleId),
      authorityScopeId:
        String(input.authorityScopeId),
      approvalClass:
        String(input.approvalClass),
      maximumFinancialValue:
        input.maximumFinancialValue == null
          ? null
          : Number(input.maximumFinancialValue),
      currency:
        String(input.currency || "USD"),
      allowedRiskSeverities:
        runtime.clone(
          input.allowedRiskSeverities ||
          ["low", "medium"]
        ),
      mayDelegate:
        Boolean(input.mayDelegate),
      requiresNoConflict:
        input.requiresNoConflict !== false,
      status:
        String(input.status || "active"),
      validFrom:
        input.validFrom || new Date().toISOString(),
      validUntil:
        input.validUntil || null,
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.decisionRightModel =
    Object.freeze({ create });
})(window);
