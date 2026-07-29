(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "DT-08",
        purpose:
          "Represent customers, segments, demand, retention, churn, engagement, satisfaction, and value.",
        stateAreas: [
          "customer profiles",
          "segments",
          "cohorts",
          "demand",
          "retention",
          "churn",
          "purchase frequency",
          "lifetime value",
          "satisfaction",
          "advocacy"
        ],
        handoffTarget:
          "DT-09"
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
