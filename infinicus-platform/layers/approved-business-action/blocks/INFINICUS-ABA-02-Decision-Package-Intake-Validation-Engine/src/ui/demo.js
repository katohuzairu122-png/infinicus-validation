(function (global) {
  "use strict";

  global.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "ABA-02",
        purpose:
          "Validate governed AI Decision Intelligence packages before action definition.",
        checks: [
          "version",
          "source layer",
          "decision state",
          "simulation evidence",
          "risk evidence",
          "constraints",
          "expected outcomes",
          "approval record",
          "confidence",
          "lineage",
          "expiry",
          "revocation",
          "idempotency"
        ],
        targetBlock: "ABA-03"
      }, null, 2);
  });
})(window);
