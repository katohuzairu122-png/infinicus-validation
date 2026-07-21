(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "BI-19",
        purpose:
          "Compare business performance across time, targets, plans, baselines, and benchmarks.",
        outputs: [
          "trend direction",
          "momentum",
          "target variance",
          "benchmark position",
          "domain ranking",
          "BI-20 handoff"
        ]
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
