(function (global) {
  "use strict";

  if (!global.INFINICUS?.DT?.runtime) {
    throw new Error("INFINICUS DT-01 must be loaded before DT-02.");
  }
})(window);
