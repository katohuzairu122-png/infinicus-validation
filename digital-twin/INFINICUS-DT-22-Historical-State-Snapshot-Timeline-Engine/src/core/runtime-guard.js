(function (global) {
  "use strict";
  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-22.");
  }

  if (!DT?.twinIntegrityConfidenceEngine) {
    throw new Error("INFINICUS DT-21 must be loaded before DT-22.");
  }
})(window);
