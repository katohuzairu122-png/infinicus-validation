(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-22.");
  }

  if (!BI?.rootCauseDriverAnalysisEngine) {
    throw new Error("INFINICUS BI-21 must be loaded before BI-22.");
  }
})(window);
