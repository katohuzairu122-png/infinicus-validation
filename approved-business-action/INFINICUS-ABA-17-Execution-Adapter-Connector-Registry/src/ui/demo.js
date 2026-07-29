(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"ABA-17",
        purpose:
          "Select healthy, compatible execution adapters and connectors.",
        controls:[
          "action-type support",
          "task-code support",
          "capabilities",
          "environment",
          "region",
          "health",
          "credential references",
          "idempotency",
          "timeouts",
          "rate limits"
        ],
        targetBlock:"ABA-18"
      },null,2);
  });
})(window);
