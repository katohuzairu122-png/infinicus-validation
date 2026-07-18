(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-15",
        purpose:
          "Evaluate external factors and confounders that may influence observed outcomes.",
        factorTypes:[
          "market",
          "regulatory",
          "operational",
          "seasonal",
          "competitive",
          "economic",
          "environmental"
        ],
        outputs:[
          "overlap score",
          "materiality",
          "direction",
          "residual confounding",
          "adjustment recommendation"
        ],
        targetBlock:"OM-16"
      },null,2);
  });
})(window);
