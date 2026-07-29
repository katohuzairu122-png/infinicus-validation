(function (global) {
  "use strict";
  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-13.");
  }

  if (!DT?.inventorySupplyTwinEngine) {
    throw new Error("INFINICUS DT-12 must be loaded before DT-13.");
  }
})(window);
