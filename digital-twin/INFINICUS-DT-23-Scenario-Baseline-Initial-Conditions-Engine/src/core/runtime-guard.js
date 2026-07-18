(function (global) {
  "use strict";
  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-23.");
  }

  if (!DT?.historicalSnapshotTimelineEngine) {
    throw new Error("INFINICUS DT-22 must be loaded before DT-23.");
  }
})(window);
