(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-08.");
  }

  if (!BI?.dataTransformationEngine) {
    throw new Error("INFINICUS BI-07 must be loaded before BI-08.");
  }
})(window);
