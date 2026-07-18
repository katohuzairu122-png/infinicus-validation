(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;

    if (!input.name || !input.sourceType) {
      return runtime.failure(
        "SOURCE_SYSTEM_INVALID",
        "name and sourceType are required."
      );
    }

    return runtime.success({
      sourceSystemId:
        input.sourceSystemId ||
        runtime.createId("bi_source_system"),
      name: String(input.name),
      sourceType: String(input.sourceType),
      owner: String(input.owner || ""),
      layer: String(input.layer || "business_operations"),
      connectionReference:
        String(input.connectionReference || ""),
      status: String(input.status || "active"),
      metadata: runtime.clone(input.metadata || {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  global.INFINICUS.BI.sourceSystemModel =
    Object.freeze({ create });
})(window);
