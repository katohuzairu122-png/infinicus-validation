(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"ABA-09",
        purpose:
          "Convert verified approval evidence into a governed approved-action contract.",
        contractSections:[
          "identity",
          "approval",
          "target",
          "parameters",
          "conditions",
          "constraints",
          "dependencies",
          "expected outcomes",
          "rollback",
          "monitoring"
        ],
        targetBlock:"ABA-10"
      },null,2);
  });
})(window);
