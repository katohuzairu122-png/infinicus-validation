(function (global) {
  "use strict";

  function isType(value, type) {
    if (value == null) return true;

    if (type === "string") {
      return typeof value === "string";
    }

    if (type === "integer") {
      return Number.isInteger(value);
    }

    if (
      ["number", "currency", "percentage"]
        .includes(type)
    ) {
      return typeof value === "number" &&
        Number.isFinite(value);
    }

    if (type === "boolean") {
      return typeof value === "boolean";
    }

    if (["date", "datetime"].includes(type)) {
      return !Number.isNaN(
        new Date(value).getTime()
      );
    }

    return true;
  }

  function evaluate({
    rule,
    record,
    context = {}
  }) {
    const value = record?.[rule.field];
    const config = rule.configuration || {};
    let passed = true;
    let message = "";

    switch (rule.ruleType) {
      case "required":
        passed =
          value !== null &&
          value !== undefined &&
          value !== "";
        message =
          `Required value missing: ${rule.field}`;
        break;

      case "type":
        passed =
          isType(value, config.dataType);
        message =
          `Invalid type for ${rule.field}; expected ${config.dataType}.`;
        break;

      case "range":
        passed =
          value == null ||
          (
            (config.minimum == null ||
              value >= config.minimum) &&
            (config.maximum == null ||
              value <= config.maximum)
          );
        message =
          `Value outside permitted range for ${rule.field}.`;
        break;

      case "pattern":
        passed =
          value == null ||
          new RegExp(config.pattern || ".*")
            .test(String(value));
        message =
          `Value does not match required pattern for ${rule.field}.`;
        break;

      case "allowed_values":
        passed =
          value == null ||
          (config.values || []).includes(value);
        message =
          `Value is not allowed for ${rule.field}.`;
        break;

      case "unique":
        passed =
          value == null ||
          !context.seenValues
            ?.get(rule.field)
            ?.has(value);
        message =
          `Duplicate value detected for ${rule.field}.`;
        break;

      case "referential":
        passed =
          value == null ||
          context.references
            ?.get(rule.field)
            ?.has(value);
        message =
          `Reference was not found for ${rule.field}.`;
        break;

      case "timeliness": {
        const date = new Date(value);
        const maximumAgeMinutes =
          Number(config.maximumAgeMinutes || 0);

        passed =
          value == null ||
          (
            !Number.isNaN(date.getTime()) &&
            (
              !maximumAgeMinutes ||
              Date.now() - date.getTime() <=
                maximumAgeMinutes * 60000
            )
          );

        message =
          `Value is stale or invalid for ${rule.field}.`;
        break;
      }

      default:
        passed = false;
        message = `Unsupported rule type: ${rule.ruleType}`;
    }

    return {
      passed,
      qualityRuleId:
        rule.qualityRuleId,
      field:
        rule.field,
      ruleType:
        rule.ruleType,
      severity:
        rule.severity,
      value,
      message:
        passed ? null : message
    };
  }

  global.INFINICUS.BI.qualityRuleEvaluator =
    Object.freeze({
      isType,
      evaluate
    });
})(window);
