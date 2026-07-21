(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-04",
        purpose:
          "Register observation sources and connectors for governed metrics.",
        validates:[
          "source type",
          "observed-state evidence",
          "health",
          "cadence",
          "freshness",
          "data quality",
          "environment",
          "region",
          "connector capabilities"
        ],
        targetBlock:"OM-05"
      },null,2);
  });
})(window);
