(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "BI-11",
        purpose:
          "Interpret profitability, cash, liquidity, runway, margin, and financial risk.",
        outputs: [
          "financial profile",
          "health score",
          "risk signals",
          "financial summary",
          "BI-19 handoff"
        ]
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
