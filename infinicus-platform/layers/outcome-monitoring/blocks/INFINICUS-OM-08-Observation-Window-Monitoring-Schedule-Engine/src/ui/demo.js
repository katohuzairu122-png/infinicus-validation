(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"OM-08",
      purpose:"Create executable monitoring schedules and evaluation checkpoints.",
      governs:[
        "observation windows",
        "cadence",
        "checkpoints",
        "grace periods",
        "late observations",
        "schedule lifecycle",
        "versioning"
      ],
      targetBlock:"OM-09"
    },null,2);
  });
})(window);
