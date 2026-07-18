(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"ABA-23",
        purpose:
          "Define exactly how expected business outcomes must be monitored.",
        contractElements:[
          "metric",
          "baseline",
          "target",
          "tolerance",
          "observation window",
          "evidence source",
          "data quality minimum",
          "alert threshold",
          "review cadence",
          "attribution requirements",
          "causation requirements"
        ],
        targetBlock:"ABA-24"
      },null,2);
  });
})(window);
