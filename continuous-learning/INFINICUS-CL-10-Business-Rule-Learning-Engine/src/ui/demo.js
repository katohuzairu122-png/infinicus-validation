(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"CL-10",
      purpose:"Generate governed business-rule updates from validated learning.",
      routes:["cl.business_rule_learning_policy.register", "cl.business_rules.learn"],
      targetBlock:"CL-11"
    },null,2);
  });
})(window);
