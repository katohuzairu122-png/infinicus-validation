(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-20.");
  }

  if (!BI?.trendVarianceBenchmarkEngine) {
    throw new Error("INFINICUS BI-19 must be loaded before BI-20.");
  }
})(window);
