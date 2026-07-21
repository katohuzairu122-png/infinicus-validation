(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-23",
        purpose:
          "Transform the outcome verdict and evidence into a reusable learning package.",
        learningOutputs:[
          "lessons",
          "success factors",
          "failure factors",
          "hypotheses",
          "limitations",
          "applicability scope",
          "decision-rule feedback",
          "model-calibration feedback",
          "data-quality learning",
          "operational learning",
          "risk learning"
        ],
        targetBlock:"OM-24"
      },null,2);
  });
})(window);
