(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    return runtime.success({
      simulationPackagePolicyId:
        input.simulationPackagePolicyId ||
        runtime.createId("dt_simulation_package_policy"),
      name:
        String(input.name || "Default simulation package policy"),
      requireHistoricalChecksum:
        input.requireHistoricalChecksum !== false,
      requireScenarioChecksum:
        input.requireScenarioChecksum !== false,
      requireReadiness:
        input.requireReadiness !== false,
      minimumBaselineStateCount:
        Math.max(
          1,
          Number(input.minimumBaselineStateCount || 1)
        ),
      allowedConditionTypes:
        runtime.clone(
          input.allowedConditionTypes || [
            "fixed",
            "bounded",
            "categorical",
            "uniform",
            "normal",
            "triangular",
            "bernoulli"
          ]
        ),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.simulationPackagePolicyModel =
    Object.freeze({ create });
})(window);
