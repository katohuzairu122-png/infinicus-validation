(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-11",
        purpose:
          "Detect material variance and governed threshold breaches.",
        detects:[
          "baseline variance",
          "target variance",
          "percentage variance",
          "acceptable-range breach",
          "tolerance breach",
          "progress breach",
          "warning severity",
          "critical severity",
          "duplicate suppression"
        ],
        targetBlock:"OM-12"
      },null,2);
  });
})(window);
