(function (global) {
  "use strict";

  const BI = global.INFINICUS?.BI;

  if (!BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-05.");
  }

  if (!BI?.dataSourceMappingEngine) {
    throw new Error("INFINICUS BI-02 must be loaded before BI-05.");
  }

  if (!BI?.dataIngestionEngine) {
    throw new Error("INFINICUS BI-03 must be loaded before BI-05.");
  }

  if (!BI?.dataQualityEngine) {
    throw new Error("INFINICUS BI-04 must be loaded before BI-05.");
  }
})(window);
