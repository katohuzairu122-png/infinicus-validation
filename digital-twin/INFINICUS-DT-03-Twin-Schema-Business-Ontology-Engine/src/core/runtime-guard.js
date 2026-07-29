(function (global) {
  "use strict";

  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-03.");
  }

  if (!DT?.twinInstanceRegistry) {
    throw new Error("INFINICUS DT-02 must be loaded before DT-03.");
  }
})(window);
