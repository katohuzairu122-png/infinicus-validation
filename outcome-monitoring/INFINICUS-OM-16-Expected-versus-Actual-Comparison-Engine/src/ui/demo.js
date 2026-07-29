(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-16",
        purpose:
          "Compare expected outcomes with actual monitored results.",
        outputs:[
          "absolute gap",
          "percentage gap",
          "achievement ratio",
          "raw confidence",
          "confounder adjustment",
          "adjusted confidence",
          "causal interpretation",
          "outcome status"
        ],
        targetBlock:"OM-17"
      },null,2);
  });
})(window);
