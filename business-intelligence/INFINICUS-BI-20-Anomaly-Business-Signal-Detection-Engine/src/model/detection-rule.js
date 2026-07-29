(function (global) {
  "use strict";

  const METHODS = Object.freeze([
    "z_score",
    "sudden_change",
    "variance_severity",
    "benchmark_breach",
    "domain_contradiction"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const method = String(input.method || "");

    if (!input.name || !METHODS.includes(method)) {
      return runtime.failure(
        "DETECTION_RULE_INVALID",
        "name and a supported method are required."
      );
    }

    return runtime.success({
      detectionRuleId:
        input.detectionRuleId ||
        runtime.createId("bi_detection_rule"),
      name:
        String(input.name),
      method,
      metricCode:
        input.metricCode || null,
      sourceBlock:
        input.sourceBlock || null,
      severity:
        String(input.severity || "warning"),
      configuration:
        runtime.clone(input.configuration || {}),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.detectionRuleModel =
    Object.freeze({
      METHODS,
      create
    });
})(window);
