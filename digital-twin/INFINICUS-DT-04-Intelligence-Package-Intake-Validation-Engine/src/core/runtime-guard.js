(function (global) {
  "use strict";

  const DT = global.INFINICUS?.DT;

  if (!DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-04.");
  }

  if (!DT?.twinInstanceRegistry) {
    throw new Error("INFINICUS DT-02 must be loaded before DT-04.");
  }

  if (!DT?.schemaOntologyEngine) {
    throw new Error("INFINICUS DT-03 must be loaded before DT-04.");
  }
})(window);
