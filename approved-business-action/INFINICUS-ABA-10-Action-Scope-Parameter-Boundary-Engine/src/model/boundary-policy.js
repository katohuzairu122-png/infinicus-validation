(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_BOUNDARY_POLICY_INVALID",
        "Boundary policy name and code are required."
      );
    }

    return runtime.success({
      actionBoundaryPolicyId:
        input.actionBoundaryPolicyId ||
        runtime.createId("aba_action_boundary_policy"),
      name:
        String(input.name),
      code:
        String(input.code),
      actionTypeIds:
        runtime.clone(input.actionTypeIds || []),
      allowedTargetTypeIds:
        runtime.clone(input.allowedTargetTypeIds || []),
      parameterRules:
        runtime.clone(input.parameterRules || {}),
      maximumFinancialValue:
        input.maximumFinancialValue == null
          ? null
          : Number(input.maximumFinancialValue),
      currency:
        String(input.currency || "USD"),
      maximumQuantity:
        input.maximumQuantity == null
          ? null
          : Number(input.maximumQuantity),
      geographicCodes:
        runtime.clone(input.geographicCodes || []),
      allowedOperations:
        runtime.clone(input.allowedOperations || []),
      forbiddenOperations:
        runtime.clone(input.forbiddenOperations || []),
      maximumDurationMinutes:
        input.maximumDurationMinutes == null
          ? null
          : Number(input.maximumDurationMinutes),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.actionBoundaryPolicyModel =
    Object.freeze({create});
})(window);
