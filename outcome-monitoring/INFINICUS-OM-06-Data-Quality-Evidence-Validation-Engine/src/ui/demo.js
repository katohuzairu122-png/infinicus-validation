(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-06",
        purpose:
          "Validate observation quality and evidence before outcome evaluation.",
        dimensions:[
          "completeness",
          "freshness",
          "consistency",
          "raw evidence",
          "lineage",
          "reliability",
          "confidence"
        ],
        targetBlock:"OM-07"
      },null,2);
  });
})(window);
