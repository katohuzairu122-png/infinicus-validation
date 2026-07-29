(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"ABA-22",
        purpose:
          "Determine whether execution was operationally completed and verified.",
        states:[
          "verified",
          "partially completed",
          "failed",
          "rolled back",
          "unverifiable"
        ],
        outputs:[
          "completion verification",
          "completion certificate",
          "verification exceptions",
          "ABA-23 handoff"
        ]
      },null,2);
  });
})(window);
