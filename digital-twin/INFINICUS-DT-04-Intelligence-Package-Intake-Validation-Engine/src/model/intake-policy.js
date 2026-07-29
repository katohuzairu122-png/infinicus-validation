(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    return runtime.success({
      intakePolicyId:
        input.intakePolicyId ||
        runtime.createId("dt_intake_policy"),
      maximumAgeMinutes:
        Math.max(1, Number(input.maximumAgeMinutes || 1440)),
      minimumConfidence:
        Math.max(
          0,
          Math.min(1, Number(input.minimumConfidence ?? 0.5))
        ),
      requireLineage:
        input.requireLineage !== false,
      requiredSections:
        Array.isArray(input.requiredSections)
          ? input.requiredSections.map(String)
          : [
              "businessState",
              "domainStates",
              "metricStates",
              "signalStates",
              "lineage"
            ],
      allowedStateSources:
        Array.isArray(input.allowedStateSources)
          ? input.allowedStateSources.map(String)
          : [
              "observed",
              "calculated",
              "inferred",
              "assumed"
            ],
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.intakePolicyModel =
    Object.freeze({ create });
})(window);
