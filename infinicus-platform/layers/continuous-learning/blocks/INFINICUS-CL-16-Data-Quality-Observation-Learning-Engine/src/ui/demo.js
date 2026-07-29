(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"CL-16",
      purpose:"Learn from observation quality, source reliability, and missing-data patterns.",
      routes:["cl.data_quality_learning_policy.register", "cl.data_quality.learn"],
      targetBlock:"CL-17"
    },null,2);
  });
})(window);
