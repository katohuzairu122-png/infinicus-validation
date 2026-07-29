(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-21.");
  }

  if (!BI?.anomalySignalDetectionEngine) {
    throw new Error("INFINICUS BI-20 must be loaded before BI-21.");
  }
})(window);
