(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-10.");
  }

  if (!BI?.dataWarehouseEngine) {
    throw new Error("INFINICUS BI-08 must be loaded before BI-10.");
  }

  if (!BI?.metricRegistryEngine) {
    throw new Error("INFINICUS BI-09 must be loaded before BI-10.");
  }
})(window);
