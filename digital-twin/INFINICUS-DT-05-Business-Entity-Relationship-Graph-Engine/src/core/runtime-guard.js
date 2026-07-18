(function (global) {
  "use strict";

  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-05.");
  }

  if (!DT?.intelligenceIntakeEngine) {
    throw new Error("INFINICUS DT-04 must be loaded before DT-05.");
  }
})(window);
