(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.entityTypeId ||
      !input.entityKey
    ) {
      return runtime.failure(
        "ENTITY_INSTANCE_INVALID",
        "twinId, entityTypeId, and entityKey are required."
      );
    }

    return runtime.success({
      entityInstanceId:
        input.entityInstanceId ||
        runtime.createId("dt_entity_instance"),
      twinId:
        String(input.twinId),
      businessId:
        String(input.businessId || ""),
      ontologyId:
        String(input.ontologyId || ""),
      entityTypeId:
        String(input.entityTypeId),
      entityKey:
        String(input.entityKey),
      attributes:
        runtime.clone(input.attributes || {}),
      sourceType:
        String(input.sourceType || "observed"),
      sourceReferences:
        runtime.clone(input.sourceReferences || []),
      lineage:
        runtime.clone(input.lineage || []),
      confidence:
        Number(input.confidence ?? 1),
      freshness:
        runtime.clone(input.freshness || {}),
      version:
        Math.max(1, Number(input.version || 1)),
      supersedesEntityInstanceId:
        input.supersedesEntityInstanceId || null,
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.entityInstanceModel =
    Object.freeze({ create });
})(window);
