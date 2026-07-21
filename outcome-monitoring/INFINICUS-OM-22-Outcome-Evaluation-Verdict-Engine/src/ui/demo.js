(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-22",
        purpose:
          "Evaluate the sealed outcome evidence package and issue a governed verdict.",
        verdicts:[
          "successful",
          "partially successful",
          "unsuccessful",
          "conditional",
          "inconclusive"
        ],
        gates:[
          "audit completeness",
          "confidence",
          "reliability",
          "critical exceptions",
          "adverse outcomes",
          "benefit realization"
        ],
        targetBlock:"OM-23"
      },null,2);
  });
})(window);
