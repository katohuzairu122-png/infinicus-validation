(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.historicalSnapshotId ||
      !input.name
    ) {
      return runtime.failure(
        "SCENARIO_DEFINITION_INVALID",
        "twinId, historicalSnapshotId, and name are required."
      );
    }

    return runtime.success({
      scenarioId:
        input.scenarioId ||
        runtime.createId("dt_scenario"),
      twinId:
        String(input.twinId),
      businessId:
        String(input.businessId || ""),
      historicalSnapshotId:
        String(input.historicalSnapshotId),
      name:
        String(input.name),
      description:
        String(input.description || ""),
      objective:
        String(input.objective || "simulation"),
      horizonDays:
        Math.max(1, Number(input.horizonDays || 90)),
      timeStep:
        String(input.timeStep || "day"),
      seed:
        String(input.seed || runtime.createId("dt_seed")),
      status:
        String(input.status || "draft"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.scenarioDefinitionModel =
    Object.freeze({ create });
})(window);
