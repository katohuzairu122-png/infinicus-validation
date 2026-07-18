(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-06.");
  }

  if (!BI?.dataCleaningEngine) {
    throw new Error("INFINICUS BI-05 must be loaded before BI-06.");
  }
})(window);
