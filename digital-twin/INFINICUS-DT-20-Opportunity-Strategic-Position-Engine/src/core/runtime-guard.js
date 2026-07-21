(function (global) {
  "use strict";

  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-20.");
  }

  if (!DT?.riskVulnerabilityStateEngine) {
    throw new Error("INFINICUS DT-19 must be loaded before DT-20.");
  }
})(window);
