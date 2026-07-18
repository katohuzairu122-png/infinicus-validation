(function (global) {
  "use strict";
  if (!global.INFINICUS?.ABA?.runtime) {
    throw new Error("INFINICUS ABA-01 must be loaded before ABA-02.");
  }
})(window);
