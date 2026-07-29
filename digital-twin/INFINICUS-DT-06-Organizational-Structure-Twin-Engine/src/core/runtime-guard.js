(function (global) {
  "use strict";

  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-06.");
  }

  if (!DT?.entityRelationshipGraphEngine) {
    throw new Error("INFINICUS DT-05 must be loaded before DT-06.");
  }
})(window);
