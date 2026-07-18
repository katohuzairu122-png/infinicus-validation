(function (global) {
  "use strict";

  const RULE_TYPES = Object.freeze([
    "trim",
    "lowercase",
    "uppercase",
    "title_case",
    "collapse_whitespace",
    "replace_null",
    "to_number",
    "round_number",
    "standardize_date",
    "standardize_datetime",
    "normalize_email",
    "normalize_phone",
    "normalize_identifier",
    "replace_pattern"
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
        "CLEANING_RULE_INVALID",
        "datasetContractId, field, and a supported ruleType are required."
      );
    }

    return runtime.success({
      cleaningRuleId:
        input.cleaningRuleId ||
        runtime.createId("bi_cleaning_rule"),
      datasetContractId:
        String(input.datasetContractId),
      field: String(input.field),
      ruleType,
      sequence:
        Math.max(1, Number(input.sequence || 1)),
      configuration:
        runtime.clone(input.configuration || {}),
      mode:
        String(input.mode || "automatic"),
      status:
        String(input.status || "active"),
      description:
        String(input.description || ""),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.cleaningRuleModel =
    Object.freeze({
      RULE_TYPES,
      create
    });
})(window);
