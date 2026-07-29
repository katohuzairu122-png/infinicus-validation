(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"ABA-12",
        purpose:
          "Detect duplicate, contradictory, overlapping, or resource-colliding actions.",
        conflictTypes:[
          "duplicate action",
          "same-target collision",
          "parameter contradiction",
          "budget collision",
          "workforce collision",
          "inventory collision",
          "capacity collision",
          "time-window overlap",
          "mutually exclusive operations"
        ],
        targetBlock:"ABA-13"
      },null,2);
  });
})(window);
