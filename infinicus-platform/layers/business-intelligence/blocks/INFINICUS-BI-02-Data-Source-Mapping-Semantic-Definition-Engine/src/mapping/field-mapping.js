(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;

    const required = [
      "sourceSystemId",
      "sourceField",
      "sourceDataType",
      "semanticEntityId",
      "targetField",
      "targetDataType"
    ];

    const missing =
      required.filter(key => !input[key]);

    if (missing.length) {
      return runtime.failure(
        "FIELD_MAPPING_INVALID",
        "Required mapping values are missing.",
        { missing }
      );
    }

    const compatibility =
      global.INFINICUS.BI.typeCompatibility.evaluate({
        sourceType: String(input.sourceDataType),
        targetType: String(input.targetDataType),
        conversionRule: input.conversionRule || null
      });

    if (!compatibility.compatible) {
      return runtime.failure(
        "TYPE_INCOMPATIBLE",
        compatibility.reason,
        compatibility
      );
    }

    return runtime.success({
      fieldMappingId:
        input.fieldMappingId ||
        runtime.createId("bi_field_mapping"),
      sourceSystemId: String(input.sourceSystemId),
      sourceDataset: String(input.sourceDataset || ""),
      sourceField: String(input.sourceField),
      sourceDataType: String(input.sourceDataType),
      semanticEntityId:
        String(input.semanticEntityId),
      targetField: String(input.targetField),
      targetDataType: String(input.targetDataType),
      conversionRule:
        input.conversionRule || null,
      defaultValue:
        input.defaultValue ?? null,
      required: Boolean(input.required),
      lineage: {
        sourceSystemId:
          String(input.sourceSystemId),
        sourceDataset:
          String(input.sourceDataset || ""),
        sourceField:
          String(input.sourceField),
        mappedAt:
          new Date().toISOString()
      },
      compatibility,
      version: Number(input.version || 1),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.BI.fieldMappingModel =
    Object.freeze({ create });
})(window);
