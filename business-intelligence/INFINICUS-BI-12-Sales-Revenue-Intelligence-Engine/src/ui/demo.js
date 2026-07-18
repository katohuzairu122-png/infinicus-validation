(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "BI-12",
        purpose:
          "Interpret revenue growth, conversion, order value, pipeline, product, and channel performance.",
        outputs: [
          "sales profile",
          "sales health score",
          "product ranking",
          "channel ranking",
          "sales signals",
          "BI-19 handoff"
        ]
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
