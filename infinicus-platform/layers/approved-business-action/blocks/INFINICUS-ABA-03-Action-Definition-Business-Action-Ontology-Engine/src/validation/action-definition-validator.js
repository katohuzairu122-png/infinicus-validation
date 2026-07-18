(function (global) {
  "use strict";

  function valueTypeMatches(value, type) {
    if (type === "integer") return Number.isInteger(value);
    if (type === "number" || type === "currency" || type === "percentage") {
      return typeof value === "number" && Number.isFinite(value);
    }
    if (type === "array") return Array.isArray(value);
    if (type === "object") {
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }
    if (type === "boolean") return typeof value === "boolean";
    if (type === "date" || type === "datetime") {
      return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
    }
    return typeof value === "string";
  }

  function validateParameter(schema, value) {
    const issues = [];

    if (value == null) {
      if (schema.required) {
        issues.push(`Required parameter is missing: ${schema.code}`);
      }
      return issues;
    }

    if (!valueTypeMatches(value, schema.valueType)) {
      issues.push(`Invalid value type for ${schema.code}`);
      return issues;
    }

    if (
      typeof value === "number" &&
      schema.minimum != null &&
      value < schema.minimum
    ) {
      issues.push(`${schema.code} is below minimum.`);
    }

    if (
      typeof value === "number" &&
      schema.maximum != null &&
      value > schema.maximum
    ) {
      issues.push(`${schema.code} exceeds maximum.`);
    }

    if (
      schema.allowedValues.length &&
      !schema.allowedValues.some(item =>
        JSON.stringify(item) === JSON.stringify(value)
      )
    ) {
      issues.push(`${schema.code} contains an unsupported value.`);
    }

    return issues;
  }

  function validateDefinition({
    actionType,
    target,
    parameters,
    parameterSchemas
  }) {
    const issues = [];

    if (!target?.targetId || !target?.targetTypeId) {
      issues.push("Action target is incomplete.");
    }

    if (target?.targetTypeId !== actionType.targetTypeId) {
      issues.push("Action target type does not match action type.");
    }

    const schemaById =
      new Map(
        parameterSchemas.map(item => [item.parameterSchemaId, item])
      );

    const requiredIds =
      new Set(actionType.requiredParameters || []);

    for (const schemaId of requiredIds) {
      const schema = schemaById.get(schemaId);

      if (!schema) {
        issues.push(`Unknown required parameter schema: ${schemaId}`);
        continue;
      }

      issues.push(
        ...validateParameter(schema, parameters[schema.code])
      );
    }

    for (const schemaId of actionType.optionalParameters || []) {
      const schema = schemaById.get(schemaId);
      if (!schema) {
        issues.push(`Unknown optional parameter schema: ${schemaId}`);
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(parameters, schema.code)) {
        issues.push(
          ...validateParameter(schema, parameters[schema.code])
        );
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  global.INFINICUS.ABA.actionDefinitionValidator =
    Object.freeze({ valueTypeMatches, validateParameter, validateDefinition });
})(window);
