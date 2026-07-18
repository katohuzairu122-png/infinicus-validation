(function (global) {
  "use strict";

  const TYPES = Object.freeze([
    "string", "number", "integer", "boolean",
    "currency", "percentage", "date", "datetime",
    "object", "array"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (
      !input.name ||
      !input.code ||
      !TYPES.includes(input.valueType)
    ) {
      return runtime.failure(
        "ABA_PARAMETER_SCHEMA_INVALID",
        "name, code, and supported valueType are required."
      );
    }

    return runtime.success({
      parameterSchemaId:
        input.parameterSchemaId || runtime.createId("aba_parameter_schema"),
      name: String(input.name),
      code: String(input.code),
      valueType: input.valueType,
      unit: input.unit || null,
      minimum: input.minimum ?? null,
      maximum: input.maximum ?? null,
      allowedValues: runtime.clone(input.allowedValues || []),
      required: Boolean(input.required),
      sensitive: Boolean(input.sensitive),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.parameterSchemaModel =
    Object.freeze({ TYPES, create });
})(window);
