(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"ABA-11",
        purpose:
          "Recheck live constraints and dependencies before execution preparation.",
        checks:[
          "budget",
          "inventory",
          "workforce",
          "legal validity",
          "risk level",
          "authority validity",
          "approval expiry",
          "business-state drift",
          "dependency availability"
        ],
        targetBlock:"ABA-12"
      },null,2);
  });
})(window);
