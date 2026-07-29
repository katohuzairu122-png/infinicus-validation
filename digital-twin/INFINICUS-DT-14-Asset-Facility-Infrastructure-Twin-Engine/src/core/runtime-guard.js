(function (global) {
  "use strict";

  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-14.");
  }

  if (!DT?.workforceCapabilityTwinEngine) {
    throw new Error("INFINICUS DT-13 must be loaded before DT-14.");
  }
})(window);
