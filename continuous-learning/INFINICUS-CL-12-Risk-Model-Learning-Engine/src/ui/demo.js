(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"CL-12",
      purpose:"Update risk factors, weights, thresholds, and controls.",
      routes:["cl.risk_learning_policy.register", "cl.risk_models.learn"],
      targetBlock:"CL-13"
    },null,2);
  });
})(window);
