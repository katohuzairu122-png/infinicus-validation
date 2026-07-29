(function (global) {
  "use strict";
  const ABA = global.INFINICUS?.ABA;
  if (!ABA?.runtime) throw new Error("ABA-01 must be loaded before ABA-03.");
  if (!ABA?.decisionPackageIntakeEngine) {
    throw new Error("ABA-02 must be loaded before ABA-03.");
  }
})(window);
