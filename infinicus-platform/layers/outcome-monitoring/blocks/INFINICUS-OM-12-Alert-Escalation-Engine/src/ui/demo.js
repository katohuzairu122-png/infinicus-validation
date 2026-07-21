(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-12",
        purpose:
          "Convert material threshold breaches into governed alerts and escalation workflows.",
        governs:[
          "severity routing",
          "owners",
          "acknowledgement deadlines",
          "escalation stages",
          "resolution evidence",
          "alert lifecycle"
        ],
        targetBlock:"OM-13"
      },null,2);
  });
})(window);
