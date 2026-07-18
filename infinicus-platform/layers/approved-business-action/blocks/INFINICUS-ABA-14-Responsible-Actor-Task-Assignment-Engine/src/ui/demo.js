(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"ABA-14",
        purpose:
          "Assign execution tasks to eligible and available responsible actors.",
        checks:[
          "capabilities",
          "role and team",
          "availability",
          "workload",
          "separation of duties",
          "primary responsibility",
          "backup responsibility",
          "acceptance or rejection"
        ],
        targetBlock:"ABA-15"
      },null,2);
  });
})(window);
