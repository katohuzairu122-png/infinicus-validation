(function (global) {
  "use strict";

  function render() {
    const output =
      document.querySelector("#output");

    output.textContent = JSON.stringify({
      block: "BI-04",
      purpose:
        "Evaluate BI-03 mapped records for quality before BI-05 cleaning.",
      qualityDimensions: [
        "completeness",
        "validity",
        "uniqueness",
        "consistency",
        "timeliness",
        "conformity"
      ],
      handoffTarget: "BI-05"
    }, null, 2);
  }

  global.addEventListener(
    "DOMContentLoaded",
    render
  );
})(window);
