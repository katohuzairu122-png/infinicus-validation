(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-20",
        purpose:
          "Detect and govern missing data, stale observations, failed checkpoints, and monitoring exceptions.",
        detects:[
          "missing observations",
          "missing checkpoints",
          "stale observations",
          "connector failures",
          "collection failures",
          "incomplete evidence"
        ],
        lifecycle:[
          "open",
          "waived",
          "resolved"
        ],
        targetBlock:"OM-21"
      },null,2);
  });
})(window);
