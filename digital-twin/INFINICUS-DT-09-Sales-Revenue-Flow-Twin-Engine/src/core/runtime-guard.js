(function (global) {
  "use strict";

  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-09.");
  }

  if (!DT?.customerDemandTwinEngine) {
    throw new Error("INFINICUS DT-08 must be loaded before DT-09.");
  }
})(window);
