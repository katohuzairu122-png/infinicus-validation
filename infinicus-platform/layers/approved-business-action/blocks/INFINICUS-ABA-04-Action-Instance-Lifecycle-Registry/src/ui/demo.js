(function (global) {
  "use strict";
  global.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "ABA-04",
        purpose:
          "Create governed action instances and enforce lifecycle transitions.",
        lifecycle: [
          "draft",
          "pending_validation",
          "pending_approval",
          "approved",
          "scheduled",
          "executing",
          "completed",
          "verified"
        ],
        controlledTerminalOrExceptionStates: [
          "rejected",
          "revoked",
          "expired",
          "blocked",
          "failed",
          "partially_completed",
          "rolled_back",
          "cancelled"
        ],
        targetBlock: "ABA-05"
      }, null, 2);
  });
})(window);
