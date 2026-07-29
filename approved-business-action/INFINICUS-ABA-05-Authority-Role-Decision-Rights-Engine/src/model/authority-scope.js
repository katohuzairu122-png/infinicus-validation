(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (!input.name || !input.scopeType) {
      return runtime.failure(
        "ABA_AUTHORITY_SCOPE_INVALID",
        "Authority scope name and scopeType are required."
      );
    }

    return runtime.success({
      authorityScopeId:
        input.authorityScopeId ||
        runtime.createId("aba_authority_scope"),
      name:
        String(input.name),
      scopeType:
        String(input.scopeType),
      businessIds:
        runtime.clone(input.businessIds || []),
      legalEntityIds:
        runtime.clone(input.legalEntityIds || []),
      departmentIds:
        runtime.clone(input.departmentIds || []),
      geographicCodes:
        runtime.clone(input.geographicCodes || []),
      actionCategoryIds:
        runtime.clone(input.actionCategoryIds || []),
      actionTypeIds:
        runtime.clone(input.actionTypeIds || []),
      targetTypeIds:
        runtime.clone(input.targetTypeIds || []),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.authorityScopeModel =
    Object.freeze({ create });
})(window);
