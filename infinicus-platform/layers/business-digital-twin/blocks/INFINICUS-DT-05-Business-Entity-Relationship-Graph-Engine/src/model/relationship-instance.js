(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.relationshipTypeId ||
      !input.sourceEntityInstanceId ||
      !input.targetEntityInstanceId
    ) {
      return runtime.failure(
        "RELATIONSHIP_INSTANCE_INVALID",
        "twinId, relationshipTypeId, sourceEntityInstanceId, and targetEntityInstanceId are required."
      );
    }

    return runtime.success({
      relationshipInstanceId:
        input.relationshipInstanceId ||
        runtime.createId("dt_relationship_instance"),
      twinId:
        String(input.twinId),
      relationshipTypeId:
        String(input.relationshipTypeId),
      sourceEntityInstanceId:
        String(input.sourceEntityInstanceId),
      targetEntityInstanceId:
        String(input.targetEntityInstanceId),
      attributes:
        runtime.clone(input.attributes || {}),
      sourceReferences:
        runtime.clone(input.sourceReferences || []),
      lineage:
        runtime.clone(input.lineage || []),
      confidence:
        Number(input.confidence ?? 1),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.relationshipInstanceModel =
    Object.freeze({ create });
})(window);
