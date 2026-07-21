(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"ABA-18",
        purpose:
          "Validate execution envelopes without producing real-world side effects.",
        checks:[
          "payload",
          "adapter and connector references",
          "credential references",
          "idempotency",
          "environment",
          "timeouts",
          "response schema",
          "side-effect prohibition"
        ],
        targetBlock:"ABA-19"
      },null,2);
  });
})(window);
