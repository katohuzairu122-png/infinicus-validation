(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "DT-07",
        purpose:
          "Represent the business's current financial state inside the Digital Twin.",
        stateAreas: [
          "assets",
          "liabilities",
          "equity",
          "revenue",
          "costs",
          "expenses",
          "cash flow",
          "budgets",
          "targets",
          "margins"
        ],
        handoffTarget:
          "DT-08"
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
