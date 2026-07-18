(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "BI-08",
        purpose:
          "Store analysis-ready data as facts, dimensions, aggregates, and snapshots.",
        datasetTypes: [
          "fact",
          "dimension",
          "aggregate",
          "snapshot"
        ],
        loadModes: [
          "append",
          "replace",
          "upsert"
        ],
        handoffTarget: "BI-09"
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
