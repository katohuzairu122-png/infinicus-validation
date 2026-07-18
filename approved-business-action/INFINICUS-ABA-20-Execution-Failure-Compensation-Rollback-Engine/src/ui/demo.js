(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"ABA-20",
        purpose:
          "Classify failures and coordinate retry, compensation, rollback, containment, or manual intervention.",
        outcomes:[
          "retryable",
          "rolled back",
          "compensated",
          "contained",
          "manual intervention required",
          "rollback failed"
        ],
        targetBlock:"ABA-21"
      },null,2);
  });
})(window);
