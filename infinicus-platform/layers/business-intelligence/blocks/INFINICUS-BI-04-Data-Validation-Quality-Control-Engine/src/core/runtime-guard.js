(function (global) {
  "use strict";

  if (!global.INFINICUS?.BI?.runtime) {
    throw new Error("INFINICUS BI-01 must be loaded before BI-04.");
  }

  if (!global.INFINICUS?.BI?.dataSourceMappingEngine) {
    throw new Error("INFINICUS BI-02 must be loaded before BI-04.");
  }

  if (!global.INFINICUS?.BI?.dataIngestionEngine) {
    throw new Error("INFINICUS BI-03 must be loaded before BI-04.");
  }
})(window);
