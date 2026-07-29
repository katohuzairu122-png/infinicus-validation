(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-13",
        purpose:
          "Assess whether outcomes are plausibly attributable to the approved action.",
        dimensions:[
          "timing",
          "scope",
          "exposure",
          "mechanism",
          "counterfactual",
          "alternative explanations"
        ],
        classifications:[
          "insufficient",
          "correlation only",
          "plausible attribution",
          "strong attribution"
        ],
        targetBlock:"OM-14"
      },null,2);
  });
})(window);
