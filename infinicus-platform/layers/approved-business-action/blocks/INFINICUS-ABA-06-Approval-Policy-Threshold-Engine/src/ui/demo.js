(function (global) {
  "use strict";

  global.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block:
          "ABA-06",
        purpose:
          "Determine the approval structure required for a governed action.",
        thresholds: [
          "financial value",
          "risk severity",
          "reversibility",
          "customer impact",
          "workforce impact",
          "legal impact",
          "data sensitivity",
          "geographic scope",
          "business criticality"
        ],
        outputs: [
          "required roles",
          "approval count",
          "workflow mode",
          "unanimity rule",
          "conditional approval rule",
          "deadline",
          "escalation roles",
          "ABA-07 handoff"
        ]
      }, null, 2);
  });
})(window);
