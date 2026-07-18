(function (global) {
  "use strict";

  global.addEventListener(
    "DOMContentLoaded",
    () => {
      document.querySelector(
        "#output"
      ).textContent =
        JSON.stringify({
          block: "DT-15",
          purpose:
            "Represent market size, competitors, pricing position, demand trends, regulation, and external forces.",
          outputs: [
            "markets",
            "segments",
            "competitors",
            "market share",
            "demand index",
            "pricing position",
            "competitive intensity",
            "differentiation",
            "external forces",
            "competitor ranking",
            "DT-16 handoff"
          ]
        }, null, 2);
    }
  );
})(window);
