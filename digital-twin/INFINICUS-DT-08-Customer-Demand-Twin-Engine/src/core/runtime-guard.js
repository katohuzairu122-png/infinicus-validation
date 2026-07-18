(function (global) {
  "use strict";

  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-08.");
  }

  if (!DT?.financialStateTwinEngine) {
    throw new Error("INFINICUS DT-07 must be loaded before DT-08.");
  }
})(window);
