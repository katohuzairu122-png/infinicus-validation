(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "BI-20",
        purpose:
          "Detect unusual values, sudden changes, benchmark breaches, and cross-domain contradictions.",
        detectionMethods: [
          "z_score",
          "sudden_change",
          "variance_severity",
          "benchmark_breach",
          "domain_contradiction"
        ],
        outputs: [
          "prioritized business signals",
          "confidence scores",
          "investigation queue",
          "BI-21 handoff"
        ]
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
