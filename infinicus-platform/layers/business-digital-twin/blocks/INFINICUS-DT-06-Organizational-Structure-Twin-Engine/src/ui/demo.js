(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "DT-06",
        purpose:
          "Model organizational units, roles, positions, reporting lines, responsibilities, and decision rights.",
        outputs: [
          "organization units",
          "roles",
          "positions",
          "reporting hierarchy",
          "span of control",
          "management layers",
          "vacancy signals",
          "DT-07 handoff"
        ]
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
