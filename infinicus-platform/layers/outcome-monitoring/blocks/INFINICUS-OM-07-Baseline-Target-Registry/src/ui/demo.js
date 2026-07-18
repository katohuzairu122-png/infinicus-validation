(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-07",
        purpose:
          "Govern baselines, targets, ranges, tolerances, and target semantics.",
        governs:[
          "baseline value",
          "target value",
          "acceptable range",
          "tolerance",
          "direction",
          "unit",
          "effective period",
          "provenance",
          "confidence",
          "lineage",
          "version"
        ],
        targetBlock:"OM-08"
      },null,2);
  });
})(window);
