(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"CL-20",
      purpose:"Govern, approve, reject, or revise proposed learning changes.",
      routes:["cl.learning_governance_policy.register", "cl.learning_changes.submit", "cl.learning_changes.review"],
      targetBlock:"CL-21"
    },null,2);
  });
})(window);
