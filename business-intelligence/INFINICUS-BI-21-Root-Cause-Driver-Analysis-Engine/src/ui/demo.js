(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "BI-21",
        purpose:
          "Investigate prioritized business signals and rank likely contributing drivers.",
        outputs: [
          "investigation case",
          "ranked drivers",
          "evidence confidence",
          "cause graph",
          "unresolved hypotheses",
          "BI-22 handoff"
        ]
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
