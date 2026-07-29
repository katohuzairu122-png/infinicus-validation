(function (global) {
  "use strict";

  global.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block:
          "ABA-05",
        purpose:
          "Determine who is eligible to approve a governed business action.",
        checks: [
          "role",
          "authority scope",
          "approval class",
          "financial limit",
          "currency",
          "risk severity",
          "department",
          "legal entity",
          "geography",
          "action category",
          "delegation",
          "conflict of interest"
        ],
        targetBlock:
          "ABA-06"
      }, null, 2);
  });
})(window);
