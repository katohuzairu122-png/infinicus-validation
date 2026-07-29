(function (global) {
  "use strict";

  const ENTITY_TYPES = Object.freeze([
    "entity",
    "fact",
    "dimension"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const entityType = String(input.entityType || "entity");

    if (!input.name || !ENTITY_TYPES.includes(entityType)) {
      return runtime.failure(
        "SEMANTIC_ENTITY_INVALID",
        "A valid name and entityType are required."
      );
    }

    const fields = Array.isArray(input.fields)
      ? input.fields.map(field => ({
          fieldId:
            field.fieldId ||
            runtime.createId("bi_semantic_field"),
          name: String(field.name || ""),
          dataType: String(field.dataType || "string"),
          nullable: Boolean(field.nullable),
          keyType: field.keyType || null,
          description: String(field.description || ""),
          unit: field.unit || null
        }))
      : [];

    if (fields.some(field => !field.name)) {
      return runtime.failure(
        "SEMANTIC_FIELD_INVALID",
        "Every semantic field requires a name."
      );
    }

    return runtime.success({
      semanticEntityId:
        input.semanticEntityId ||
        runtime.createId("bi_semantic_entity"),
      name: String(input.name),
      entityType,
      description: String(input.description || ""),
      grain: String(input.grain || ""),
      fields,
      businessOwner: String(input.businessOwner || ""),
      dataOwner: String(input.dataOwner || ""),
      version: Number(input.version || 1),
      status: String(input.status || "draft"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  global.INFINICUS.BI.semanticEntityModel =
    Object.freeze({
      ENTITY_TYPES,
      create
    });
})(window);
