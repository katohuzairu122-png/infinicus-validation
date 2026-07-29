(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-21",
        purpose:
          "Assemble and seal the complete governed outcome evidence chain.",
        auditChain:[
          "action",
          "monitoring contract",
          "observations",
          "quality validation",
          "progress",
          "variance",
          "alerts",
          "attribution",
          "causation",
          "confounders",
          "comparison",
          "confidence",
          "benefits",
          "adverse outcomes",
          "exceptions"
        ],
        targetBlock:"OM-22"
      },null,2);
  });
})(window);
