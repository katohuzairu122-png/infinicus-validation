(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"CL-05",
        purpose:
          "Determine where and under which operating conditions learning may be applied.",
        dimensions:[
          "business type",
          "market",
          "geography",
          "scale",
          "customer segment",
          "channel",
          "operating model",
          "time horizon"
        ],
        classifications:[
          "broad",
          "conditional",
          "restricted",
          "out of scope"
        ],
        targetBlock:"CL-06"
      },null,2);
  });
})(window);
