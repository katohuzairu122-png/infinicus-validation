(function (global) {
  "use strict";

  function render() {
    document.querySelector("#output").textContent =
      JSON.stringify({
        block: "DT-05",
        purpose:
          "Construct ontology-valid entity instances and relationship graphs for the Business Digital Twin.",
        capabilities: [
          "entity registry",
          "relationship registry",
          "cardinality validation",
          "graph traversal",
          "orphan detection",
          "unresolved-reference detection"
        ],
        handoffTarget:
          "DT-06"
      }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
