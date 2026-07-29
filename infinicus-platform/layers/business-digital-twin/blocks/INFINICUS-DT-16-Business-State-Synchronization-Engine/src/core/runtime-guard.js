(function (global) {
  "use strict";

  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-16.");
  }

  if (!DT?.marketCompetitiveTwinEngine) {
    throw new Error("INFINICUS DT-15 must be loaded before DT-16.");
  }
})(window);
