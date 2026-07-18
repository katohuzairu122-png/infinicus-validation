(function (global) {
  "use strict";

  const RULE_TYPES = Object.freeze([
    "rename_field",
    "copy_field",
    "constant",
    "formula",
    "classification",
    "lookup",
    "date_parts",
    "project_fields",
    "drop_field"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const ruleType = String(input.ruleType || "");

    if (
      !input.datasetContractId ||
      !RULE_TYPES.includes(ruleType)
    ) {
      return runtime.failure(
        "TRANSFORMATION_RULE_INVALID",
        "datasetContractId and a supported ruleType are required."
      );
    }

    return runtime.success({
      transformationRuleId:
        input.transformationRuleId ||
        runtime.createId("bi_transformation_rule"),
      datasetContractId:
        String(input.datasetContractId),
      ruleType,
      targetField:
        input.targetField || null,
      sourceFields:
        Array.isArray(input.sourceFields)
          ? input.sourceFields.map(String)
          : [],
      sequence:
        Math.max(1, Number(input.sequence || 1)),
      configuration:
        runtime.clone(input.configuration || {}),
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

  global.INFINICUS.BI.transformationRuleModel =
    Object.freeze({
      RULE_TYPES,
      create
    });
})(window);
