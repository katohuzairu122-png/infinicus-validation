(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "BI-07",
        purpose:
          "Convert resolved records into analysis-ready structures.",
        transformationTypes: [
          "rename_field",
          "copy_field",
          "constant",
          "formula",
          "classification",
          "lookup",
          "date_parts",
          "project_fields",
          "drop_field"
        ],
        handoffTarget: "BI-08"
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
