(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-05",
        purpose:
          "Collect actual observations from governed sources and connectors.",
        controls:[
          "source binding",
          "connector selection",
          "observed classification",
          "source timestamp",
          "freshness",
          "idempotency",
          "raw evidence",
          "collection run",
          "dead letters"
        ],
        targetBlock:"OM-06"
      },null,2);
  });
})(window);
