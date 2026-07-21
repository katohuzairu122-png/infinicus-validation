(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"CL-07",
      purpose:"Detect duplicate, conflicting, and contradictory learning items.",
      routes:["cl.learning_conflict_policy.register", "cl.learning_conflicts.detect"],
      targetBlock:"CL-08"
    },null,2);
  });
})(window);
