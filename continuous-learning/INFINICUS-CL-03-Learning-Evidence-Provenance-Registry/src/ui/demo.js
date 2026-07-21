(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"CL-03",
        purpose:
          "Register governed learning evidence, provenance, and traceability.",
        registers:[
          "evidence items",
          "source references",
          "provenance",
          "lineage",
          "correlation",
          "evidence bindings",
          "duplicate fingerprints"
        ],
        targetBlock:"CL-04"
      },null,2);
  });
})(window);
