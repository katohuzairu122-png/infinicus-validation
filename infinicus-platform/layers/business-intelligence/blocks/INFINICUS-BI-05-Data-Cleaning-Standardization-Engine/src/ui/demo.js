(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "BI-05",
        purpose:
          "Clean and standardize BI-04 accepted and warning records.",
        automaticRules: [
          "trim",
          "collapse_whitespace",
          "normalize_email",
          "normalize_phone",
          "standardize_date",
          "to_number"
        ],
        manualPath:
          "Quarantined BI-04 records become manual remediation items.",
        handoffTarget: "BI-06"
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
