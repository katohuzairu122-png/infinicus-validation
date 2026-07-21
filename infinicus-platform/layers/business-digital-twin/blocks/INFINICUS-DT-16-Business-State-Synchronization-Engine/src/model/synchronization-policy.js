(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime =
      global.INFINICUS.DT.runtime;

    return runtime.success({
      synchronizationPolicyId:
        input.synchronizationPolicyId ||
        runtime.createId(
          "dt_sync_policy"
        ),
      name:
        String(
          input.name ||
          "Default synchronization policy"
        ),
      sourcePriority:
        runtime.clone(
          input.sourcePriority || [
            "observed",
            "calculated",
            "inferred",
            "assumed"
          ]
        ),
      minimumConfidence:
        Math.max(
          0,
          Math.min(
            1,
            Number(
              input.minimumConfidence ?? 0.5
            )
          )
        ),
      maximumAgeMinutes:
        Math.max(
          1,
          Number(
            input.maximumAgeMinutes || 1440
          )
        ),
      conflictTolerance:
        Math.max(
          0,
          Number(
            input.conflictTolerance || 0
          )
        ),
      rejectSimulatedState:
        input.rejectSimulatedState !== false,
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT
    .synchronizationPolicyModel =
      Object.freeze({ create });
})(window);
