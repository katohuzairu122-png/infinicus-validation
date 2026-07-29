(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"CL-11",
      purpose:"Generate decision-policy updates from governed learning.",
      routes:["cl.decision_policy_learning_policy.register", "cl.decision_policies.learn"],
      targetBlock:"CL-12"
    },null,2);
  });
})(window);
