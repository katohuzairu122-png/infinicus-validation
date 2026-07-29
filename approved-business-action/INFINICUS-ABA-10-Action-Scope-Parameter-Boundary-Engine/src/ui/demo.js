(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"ABA-10",
        purpose:
          "Convert the approved action contract into enforceable execution boundaries.",
        boundaries:[
          "target",
          "parameters",
          "financial value",
          "quantity",
          "geography",
          "time window",
          "operations",
          "conditions"
        ],
        targetBlock:"ABA-11"
      },null,2);
  });
})(window);
