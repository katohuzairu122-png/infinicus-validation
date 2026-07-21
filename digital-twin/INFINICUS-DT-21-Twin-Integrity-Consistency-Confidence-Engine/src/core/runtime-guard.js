(function (global) {
  "use strict";
  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-21.");
  }

  if (!DT?.opportunityStrategicPositionEngine) {
    throw new Error("INFINICUS DT-20 must be loaded before DT-21.");
  }
})(window);
