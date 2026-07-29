(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "BI-09",
        purpose:
          "Define governed business metrics and KPIs before calculation.",
        metricTypes: [
          "base",
          "derived",
          "ratio",
          "rate",
          "target"
        ],
        requiredDefinition: [
          "warehouse dataset",
          "aggregation",
          "grain",
          "dimensions",
          "filters",
          "unit",
          "target",
          "owner",
          "version"
        ],
        handoffTarget: "BI-10"
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
