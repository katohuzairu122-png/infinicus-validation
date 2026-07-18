(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "BI-13",
        purpose:
          "Interpret acquisition, activation, retention, churn, engagement, satisfaction, and lifetime value.",
        outputs: [
          "customer profile",
          "customer health score",
          "cohort ranking",
          "customer signals",
          "BI-19 handoff"
        ]
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
