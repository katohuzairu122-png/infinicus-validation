(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"ABA-21",
        purpose:
          "Consolidate execution, failure, rollback, and compensation evidence into a tamper-evident audit package.",
        evidence:[
          "execution results",
          "external responses",
          "attempts",
          "failures",
          "rollback attempts",
          "compensation evidence",
          "checksums",
          "audit events"
        ],
        targetBlock:"ABA-22"
      },null,2);
  });
})(window);
