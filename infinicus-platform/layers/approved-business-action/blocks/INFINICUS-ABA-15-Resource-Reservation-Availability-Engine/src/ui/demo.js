(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"ABA-15",
      purpose:"Reserve the resources required by accepted execution assignments.",
      resources:[
        "budget",
        "workforce hours",
        "inventory",
        "assets",
        "capacity",
        "service quotas"
      ],
      controls:[
        "availability",
        "overbooking prevention",
        "expiry",
        "release",
        "failure evidence"
      ],
      targetBlock:"ABA-16"
    },null,2);
  });
})(window);
