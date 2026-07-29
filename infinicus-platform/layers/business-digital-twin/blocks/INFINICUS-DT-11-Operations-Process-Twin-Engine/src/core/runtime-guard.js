(function (global) {
  "use strict";
  const DT = global.INFINICUS?.DT;
  if (!DT?.runtime) throw new Error("INFINICUS DT-01 must be loaded before DT-11.");
  if (!DT?.marketingAcquisitionTwinEngine) throw new Error("INFINICUS DT-10 must be loaded before DT-11.");
})(window);
