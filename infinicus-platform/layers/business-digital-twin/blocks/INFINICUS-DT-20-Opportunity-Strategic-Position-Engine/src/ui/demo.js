(function (global) {
  "use strict";

  global.addEventListener(
    "DOMContentLoaded",
    () => {
      document.querySelector(
        "#output"
      ).textContent =
        JSON.stringify({
          block: "DT-20",
          purpose:
            "Represent growth opportunities, strategic capabilities, readiness, feasibility, fit, effort, and risk-adjusted priority.",
          outputs: [
            "strategic capabilities",
            "opportunities",
            "expected value",
            "readiness",
            "feasibility",
            "strategic fit",
            "effort",
            "risk adjustment",
            "capability gaps",
            "portfolio ranking",
            "DT-21 handoff"
          ]
        }, null, 2);
    }
  );
})(window);
