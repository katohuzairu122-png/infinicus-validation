(function (global) {
  "use strict";
  const ABA = global.INFINICUS?.ABA;

  if (!ABA?.runtime) throw new Error("ABA-01 must be loaded before ABA-04.");
  if (!ABA?.actionDefinitionOntologyEngine) {
    throw new Error("ABA-03 must be loaded before ABA-04.");
  }
})(window);
