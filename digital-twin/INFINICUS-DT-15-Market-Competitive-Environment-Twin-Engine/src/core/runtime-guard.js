(function (global) {
  "use strict";
  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-15.");
  }

  if (!DT?.assetInfrastructureTwinEngine) {
    throw new Error("INFINICUS DT-14 must be loaded before DT-15.");
  }
})(window);
