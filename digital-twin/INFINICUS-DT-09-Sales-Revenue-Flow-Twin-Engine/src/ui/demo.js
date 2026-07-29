(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "DT-09",
        purpose:
          "Represent leads, pipeline, opportunities, orders, conversion, and revenue flow.",
        stateAreas: [
          "pipeline stages",
          "opportunities",
          "weighted pipeline",
          "orders",
          "sales channels",
          "revenue streams",
          "recurring revenue",
          "sales velocity"
        ],
        handoffTarget:
          "DT-10"
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
