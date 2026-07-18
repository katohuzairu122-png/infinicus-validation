(function (global) {
  "use strict";

  const RULE_TYPES = Object.freeze([
    "required",
    "type",
    "range",
    "pattern",
    "allowed_values",
    "unique",
    "referential",
    "timeliness"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const ruleType = String(input.ruleType || "");

    if (
      !input.datasetContractId ||
      !input.field ||
      !RULE_TYPES.includes(ruleType)
    ) {
      return runtime.failure(
        "QUALITY_RULE_INVALID",
        "datasetContractId, field, and a supported ruleType are required."
      );
    }

    return runtime.success({
      qualityRuleId:
        input.qualityRuleId ||
        runtime.createId("bi_quality_rule"),
      datasetContractId:
        String(input.datasetContractId),
      field: String(input.field),
      ruleType,
      severity:
        String(input.severity || "error"),
      configuration:
        runtime.clone(input.configuration || {}),
      description:
        String(input.description || ""),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  global.INFINICUS.BI.qualityRuleModel =
    Object.freeze({
      RULE_TYPES,
      create
    });
})(window);
