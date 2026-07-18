(function (global) {
  "use strict";

  const VALUE_TYPES = Object.freeze([
    "string",
    "number",
    "boolean",
    "date",
    "datetime",
    "currency",
    "percentage",
    "identifier",
    "object",
    "array"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (!input.name || !input.code) {
      return runtime.failure(
        "ENTITY_TYPE_INVALID",
        "name and code are required."
      );
    }

    const attributes = (input.attributes || []).map(attribute => ({
      attributeId:
        attribute.attributeId ||
        runtime.createId("dt_attribute"),
      name:
        String(attribute.name || ""),
      code:
        String(attribute.code || "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_"),
      valueType:
        VALUE_TYPES.includes(attribute.valueType)
          ? attribute.valueType
          : "string",
      required:
        Boolean(attribute.required),
      multiple:
        Boolean(attribute.multiple),
      defaultValue:
        attribute.defaultValue ?? null,
      constraints:
        runtime.clone(attribute.constraints || {})
    }));

    return runtime.success({
      entityTypeId:
        input.entityTypeId ||
        runtime.createId("dt_entity_type"),
      name:
        String(input.name),
      code:
        String(input.code)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_"),
      description:
        String(input.description || ""),
      parentEntityTypeId:
        input.parentEntityTypeId || null,
      attributes,
      labels:
        runtime.clone(input.labels || {}),
      status:
        String(input.status || "active")
    });
  }

  global.INFINICUS.DT.entityTypeModel =
    Object.freeze({
      VALUE_TYPES,
      create
    });
})(window);
