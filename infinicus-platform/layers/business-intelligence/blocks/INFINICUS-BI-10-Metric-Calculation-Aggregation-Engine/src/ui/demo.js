(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "BI-10",
        purpose:
          "Calculate approved BI-09 metrics from BI-08 warehouse data.",
        supportedAggregations: [
          "sum",
          "count",
          "count_distinct",
          "average",
          "minimum",
          "maximum",
          "median",
          "first",
          "last"
        ],
        outputs: [
          "metric values",
          "dimensional groups",
          "time buckets",
          "target status",
          "threshold status",
          "calculation evidence"
        ],
        handoffTargets:
          "BI-11 through BI-18"
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
