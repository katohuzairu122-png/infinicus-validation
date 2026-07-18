(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "DT-03",
        purpose:
          "Define the formal ontology, entity types, relationships, states, and constraints of each Digital Twin.",
        components: [
          "entity types",
          "attributes",
          "relationship types",
          "state models",
          "vocabularies",
          "constraints",
          "versioning"
        ],
        handoffTarget:
          "DT-04"
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
