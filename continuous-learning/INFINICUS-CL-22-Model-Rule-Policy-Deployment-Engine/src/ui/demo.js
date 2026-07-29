(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"CL-22",
      purpose:"Deploy approved model, rule, and policy updates.",
      routes:["cl.learning_deployment_policy.register", "cl.learning_updates.deploy"],
      targetBlock:"CL-23"
    },null,2);
  });
})(window);
