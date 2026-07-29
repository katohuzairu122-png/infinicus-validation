(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (!input.name || !input.code) {
      return runtime.failure(
        "ABA_TARGET_TYPE_INVALID",
        "Target type name and code are required."
      );
    }

    return runtime.success({
      targetTypeId:
        input.targetTypeId || runtime.createId("aba_target_type"),
      name: String(input.name),
      code: String(input.code)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_"),
      allowedReferencePatterns:
        runtime.clone(input.allowedReferencePatterns || []),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.targetTypeModel =
    Object.freeze({ create });
})(window);
