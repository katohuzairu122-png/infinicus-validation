(function (global) {
  "use strict";

  function getValue(record, path) {
    return String(path || "")
      .split(".")
      .filter(Boolean)
      .reduce((value, key) => value?.[key], record);
  }

  function convert(value, rule, targetType) {
    if (value == null) return value;

    if (rule === "trim") {
      return String(value).trim();
    }

    if (rule === "uppercase") {
      return String(value).toUpperCase();
    }

    if (rule === "lowercase") {
      return String(value).toLowerCase();
    }

    if (rule === "to_number") {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new Error(`Cannot convert value to number: ${value}`);
      }
      return parsed;
    }

    if (rule === "to_boolean") {
      if (typeof value === "boolean") return value;
      const normalized = String(value).trim().toLowerCase();
      if (["true", "1", "yes"].includes(normalized)) return true;
      if (["false", "0", "no"].includes(normalized)) return false;
      throw new Error(`Cannot convert value to boolean: ${value}`);
    }

    if (targetType === "integer") {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed)) {
        throw new Error(`Cannot convert value to integer: ${value}`);
      }
      return parsed;
    }

    if (["number", "currency", "percentage"].includes(targetType)) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new Error(`Cannot convert value to number: ${value}`);
      }
      return parsed;
    }

    if (["date", "datetime"].includes(targetType)) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new Error(`Cannot convert value to date: ${value}`);
      }
      return date.toISOString();
    }

    return String(value);
  }

  function mapRecord(record, mappings = []) {
    const output = {};
    const errors = [];

    for (const mapping of mappings) {
      try {
        let value = getValue(record, mapping.sourceField);

        if (
          (value == null || value === "") &&
          mapping.defaultValue != null
        ) {
          value = mapping.defaultValue;
        }

        if (
          mapping.required &&
          (value == null || value === "")
        ) {
          throw new Error(
            `Required source value is missing: ${mapping.sourceField}`
          );
        }

        output[mapping.targetField] = convert(
          value,
          mapping.conversionRule,
          mapping.targetDataType
        );
      } catch (error) {
        errors.push({
          sourceField: mapping.sourceField,
          targetField: mapping.targetField,
          code: "MAPPING_FAILED",
          message: error?.message || "Record mapping failed."
        });
      }
    }

    return {
      valid: errors.length === 0,
      record: output,
      errors
    };
  }

  global.INFINICUS.BI.ingestionRecordMapper =
    Object.freeze({
      getValue,
      convert,
      mapRecord
    });
})(window);
