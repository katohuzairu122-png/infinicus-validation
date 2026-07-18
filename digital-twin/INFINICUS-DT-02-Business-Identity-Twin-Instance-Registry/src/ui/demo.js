(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "DT-02",
        purpose:
          "Register businesses and create governed Digital Twin instances.",
        twinTypes: [
          "business",
          "branch",
          "department",
          "project",
          "business_unit",
          "location",
          "subsidiary"
        ],
        lifecycleStates:
          global.INFINICUS.DT.runtime.lifecycle.STATES,
        handoffTarget:
          "DT-03"
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
