(function (global) {
  "use strict";

  const CARDINALITIES = Object.freeze([
    "one_to_one",
    "one_to_many",
    "many_to_one",
    "many_to_many"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.name ||
      !input.code ||
      !input.sourceEntityTypeId ||
      !input.targetEntityTypeId
    ) {
      return runtime.failure(
        "RELATIONSHIP_TYPE_INVALID",
        "name, code, sourceEntityTypeId, and targetEntityTypeId are required."
      );
    }

    return runtime.success({
      relationshipTypeId:
        input.relationshipTypeId ||
        runtime.createId("dt_relationship_type"),
      name:
        String(input.name),
      code:
        String(input.code)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_"),
      sourceEntityTypeId:
        String(input.sourceEntityTypeId),
      targetEntityTypeId:
        String(input.targetEntityTypeId),
      cardinality:
        CARDINALITIES.includes(input.cardinality)
          ? input.cardinality
          : "many_to_many",
      directed:
        input.directed !== false,
      attributes:
        runtime.clone(input.attributes || []),
      constraints:
        runtime.clone(input.constraints || {}),
      status:
        String(input.status || "active")
    });
  }

  global.INFINICUS.DT.relationshipTypeModel =
    Object.freeze({
      CARDINALITIES,
      create
    });
})(window);
