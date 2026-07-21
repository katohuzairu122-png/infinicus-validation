(function (global) {
  "use strict";

  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-07.");
  }

  if (!DT?.organizationalStructureEngine) {
    throw new Error("INFINICUS DT-06 must be loaded before DT-07.");
  }
})(window);
