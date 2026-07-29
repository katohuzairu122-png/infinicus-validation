(function (global) {
  "use strict";

  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-10.");
  }

  if (!DT?.salesRevenueFlowTwinEngine) {
    throw new Error("INFINICUS DT-09 must be loaded before DT-10.");
  }
})(window);
