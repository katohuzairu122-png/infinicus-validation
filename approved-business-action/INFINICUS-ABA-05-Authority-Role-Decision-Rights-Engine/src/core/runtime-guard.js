(function (global) {
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if (!ABA?.runtime) {
    throw new Error("ABA-01 must be loaded before ABA-05.");
  }

  if (!ABA?.actionInstanceLifecycleRegistry) {
    throw new Error("ABA-04 must be loaded before ABA-05.");
  }
})(window);
