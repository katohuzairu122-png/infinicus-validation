(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"BI-23",
      purpose:"Distribute governed reports and alerts to authorized audiences.",
      controls:[
        "severity routing",
        "audience authorization",
        "channel health",
        "delivery evidence",
        "acknowledgement",
        "retry",
        "escalation",
        "dead letters"
      ],
      targetBlock:"BI-24"
    },null,2);
  });
})(window);
