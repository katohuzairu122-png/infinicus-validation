(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "DT-10",
        purpose:
          "Represent campaigns, channels, audiences, acquisition economics, and attribution state.",
        stateAreas: [
          "channels",
          "audiences",
          "campaigns",
          "spend",
          "reach",
          "impressions",
          "engagement",
          "leads",
          "conversions",
          "CAC",
          "ROAS",
          "ROI",
          "attribution"
        ],
        handoffTarget:
          "DT-11"
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
