(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"OM-19",
      purpose:"Detect unintended negative outcomes and side effects of approved actions.",
      detects:[
        "negative outcomes",
        "unintended effects",
        "displaced costs",
        "benefit offsets",
        "persistent effects",
        "irreversible effects",
        "mitigation requirements"
      ],
      targetBlock:"OM-20"
    },null,2);
  });
})(window);
