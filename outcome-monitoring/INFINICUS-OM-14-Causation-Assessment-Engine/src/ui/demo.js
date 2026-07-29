(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-14",
        purpose:
          "Assess whether evidence supports a causal relationship between action and outcome.",
        dimensions:[
          "temporal order",
          "mechanism",
          "dose response",
          "counterfactual",
          "confounders",
          "alternative explanations",
          "reproducibility"
        ],
        classifications:[
          "inconclusive",
          "weak causal support",
          "plausible causal support",
          "strong causal support"
        ],
        targetBlock:"OM-15"
      },null,2);
  });
})(window);
