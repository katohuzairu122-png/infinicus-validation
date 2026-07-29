(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-17",
        purpose:
          "Produce governed confidence and reliability ratings for monitored outcomes.",
        dimensions:[
          "comparison confidence",
          "attribution confidence",
          "causation confidence",
          "source reliability",
          "sample sufficiency",
          "temporal coverage",
          "evidence completeness",
          "confounder penalty"
        ],
        targetBlock:"OM-18"
      },null,2);
  });
})(window);
