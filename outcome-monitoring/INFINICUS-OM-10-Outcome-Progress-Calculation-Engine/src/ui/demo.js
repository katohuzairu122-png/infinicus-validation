(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-10",
        purpose:
          "Calculate progress from baseline to current state and target.",
        supports:[
          "increase targets",
          "decrease targets",
          "maintain targets",
          "range targets",
          "target gaps",
          "completion states",
          "confidence propagation"
        ],
        targetBlock:"OM-11"
      },null,2);
  });
})(window);
