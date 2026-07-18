(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-07.");
  }

  if (!BI?.entityResolutionEngine) {
    throw new Error("INFINICUS BI-06 must be loaded before BI-07.");
  }
})(window);
