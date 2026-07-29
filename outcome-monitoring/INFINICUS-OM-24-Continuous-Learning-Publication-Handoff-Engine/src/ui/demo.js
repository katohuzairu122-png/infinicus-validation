(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-24",
        purpose:
          "Publish governed learning packages to the Continuous Learning layer.",
        controls:[
          "confidence gate",
          "reliability gate",
          "applicability scope",
          "limitations",
          "hypothesis policy",
          "idempotency",
          "publication receipt",
          "retry evidence"
        ],
        targetBlock:"OM-25"
      },null,2);
  });
})(window);
