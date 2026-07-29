(function (global) {
  "use strict";
  const DT = global.INFINICUS?.DT;
  if (!DT?.runtime) throw new Error("INFINICUS DT-01 must be loaded before DT-12.");
  if (!DT?.operationsProcessTwinEngine) throw new Error("INFINICUS DT-11 must be loaded before DT-12.");
})(window);
