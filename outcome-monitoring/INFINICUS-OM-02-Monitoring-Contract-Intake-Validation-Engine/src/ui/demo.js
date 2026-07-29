(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"OM-02",
      purpose:"Receive and validate ABA-24 monitoring contracts.",
      validates:[
        "contract identity",
        "action identity",
        "completion certificate",
        "outcomes",
        "metrics",
        "baselines",
        "targets",
        "sources",
        "windows",
        "lineage",
        "confidence",
        "attribution",
        "causation"
      ],
      targetBlock:"OM-03"
    },null,2);
  });
})(window);
