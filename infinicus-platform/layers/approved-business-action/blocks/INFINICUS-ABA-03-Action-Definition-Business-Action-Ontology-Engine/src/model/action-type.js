(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (
      !input.name ||
      !input.code ||
      !input.actionCategoryId ||
      !input.targetTypeId
    ) {
      return runtime.failure(
        "ABA_ACTION_TYPE_INVALID",
        "name, code, actionCategoryId, and targetTypeId are required."
      );
    }

    return runtime.success({
      actionTypeId:
        input.actionTypeId || runtime.createId("aba_action_type"),
      name: String(input.name),
      code: String(input.code)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_"),
      description: String(input.description || ""),
      actionCategoryId: String(input.actionCategoryId),
      targetTypeId: String(input.targetTypeId),
      requiredParameters:
        runtime.clone(input.requiredParameters || []),
      optionalParameters:
        runtime.clone(input.optionalParameters || []),
      reversibility:
        String(input.reversibility || "conditional"),
      requiredApprovalClass:
        String(input.requiredApprovalClass || "standard"),
      requiredMonitoring:
        runtime.clone(input.requiredMonitoring || []),
      supportedAdapterCodes:
        runtime.clone(input.supportedAdapterCodes || []),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.actionTypeModel =
    Object.freeze({ create });
})(window);
