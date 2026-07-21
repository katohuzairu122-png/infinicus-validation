(function (global) {
  "use strict";
  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-11.");
  }

  if (!BI?.metricCalculationEngine) {
    throw new Error("INFINICUS BI-10 must be loaded before BI-11.");
  }
})(window);
