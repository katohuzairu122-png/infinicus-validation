(function (global) {
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if (!ABA?.runtime) {
    throw new Error("ABA-01 must be loaded before ABA-06.");
  }

  if (!ABA?.authorityDecisionRightsEngine) {
    throw new Error("ABA-05 must be loaded before ABA-06.");
  }
})(window);
