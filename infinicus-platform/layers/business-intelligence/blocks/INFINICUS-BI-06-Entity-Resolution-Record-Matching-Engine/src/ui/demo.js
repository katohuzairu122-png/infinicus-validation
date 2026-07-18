(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "BI-06",
        purpose:
          "Identify records that represent the same real-world business entity.",
        matchingMethods: [
          "exact",
          "normalized_exact",
          "string_similarity",
          "numeric_tolerance"
        ],
        classifications: [
          "automatic_match",
          "manual_review",
          "no_match"
        ],
        handoffTarget: "BI-07"
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
