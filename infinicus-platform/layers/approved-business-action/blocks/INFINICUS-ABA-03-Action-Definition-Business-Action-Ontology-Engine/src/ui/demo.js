(function (global) {
  "use strict";
  global.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "ABA-03",
        purpose:
          "Normalize accepted decisions into governed business-action definitions.",
        outputs: [
          "action categories",
          "target types",
          "parameter schemas",
          "action types",
          "validated action definitions",
          "approval requirements",
          "reversibility",
          "monitoring requirements",
          "adapter requirements",
          "ABA-04 handoff"
        ]
      }, null, 2);
  });
})(window);
