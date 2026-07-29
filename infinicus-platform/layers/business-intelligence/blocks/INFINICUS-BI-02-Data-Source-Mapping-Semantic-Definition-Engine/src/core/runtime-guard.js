(function (global) {
  "use strict";

  if (!global.INFINICUS?.BI?.runtime) {
    throw new Error(
      "INFINICUS BI-01 must be loaded before BI-02."
    );
  }
})(window);
