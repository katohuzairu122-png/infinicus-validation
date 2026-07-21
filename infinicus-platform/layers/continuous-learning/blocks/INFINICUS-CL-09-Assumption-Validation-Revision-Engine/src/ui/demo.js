(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"CL-09",
      purpose:"Validate, confirm, challenge, and revise business assumptions.",
      routes:["cl.assumption_policy.register", "cl.assumptions.validate"],
      targetBlock:"CL-10"
    },null,2);
  });
})(window);
