(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"CL-02",
        purpose:
          "Receive, validate, accept, or quarantine OM-24 learning publications.",
        validates:[
          "publication identity",
          "publication receipt",
          "package version",
          "verdict identity",
          "confidence",
          "reliability",
          "applicability scope",
          "limitations",
          "lessons",
          "hypotheses",
          "correlation",
          "lineage"
        ],
        targetBlock:"CL-03"
      },null,2);
  });
})(window);
