(function (global) {
  "use strict";
  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-24.");
  }

  if (!DT?.scenarioBaselineEngine) {
    throw new Error("INFINICUS DT-23 must be loaded before DT-24.");
  }
})(window);
