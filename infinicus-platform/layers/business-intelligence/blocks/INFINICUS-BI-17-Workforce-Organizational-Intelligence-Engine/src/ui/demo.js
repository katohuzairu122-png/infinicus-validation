(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "BI-17",
        purpose:
          "Interpret staffing, attendance, turnover, engagement, productivity, workload, and skills.",
        outputs: [
          "workforce profile",
          "workforce health score",
          "team ranking",
          "role-risk ranking",
          "location ranking",
          "workforce signals",
          "BI-19 handoff"
        ]
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
