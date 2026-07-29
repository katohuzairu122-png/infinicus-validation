(function (global) {
  "use strict";

  const METHODS = Object.freeze([
    "exact",
    "normalized_exact",
    "string_similarity",
    "numeric_tolerance"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;

    if (
      !input.datasetContractId ||
      !input.entityType ||
      !Array.isArray(input.fields) ||
      !input.fields.length
    ) {
      return runtime.failure(
        "MATCH_RULE_INVALID",
        "datasetContractId, entityType, and fields are required."
      );
    }

    const fields = input.fields.map(field => ({
      field: String(field.field || ""),
      method:
        METHODS.includes(field.method)
          ? field.method
          : "exact",
      weight:
        Math.max(0, Number(field.weight || 0)),
      tolerance:
        Number(field.tolerance || 0)
    }));

    if (fields.some(field => !field.field)) {
      return runtime.failure(
        "MATCH_FIELD_INVALID",
        "Every match field requires a field name."
      );
    }

    return runtime.success({
      matchRuleId:
        input.matchRuleId ||
        runtime.createId("bi_match_rule"),
      datasetContractId:
        String(input.datasetContractId),
      entityType:
        String(input.entityType),
      blockingFields:
        Array.isArray(input.blockingFields)
          ? [...new Set(
              input.blockingFields.map(String)
            )]
          : [],
      fields,
      automaticMatchThreshold:
        Math.max(
          0,
          Math.min(
            1,
            Number(
              input.automaticMatchThreshold || 0.9
            )
          )
        ),
      reviewThreshold:
        Math.max(
          0,
          Math.min(
            1,
            Number(input.reviewThreshold || 0.7)
          )
        ),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.matchRuleModel =
    Object.freeze({
      METHODS,
      create
    });
})(window);
