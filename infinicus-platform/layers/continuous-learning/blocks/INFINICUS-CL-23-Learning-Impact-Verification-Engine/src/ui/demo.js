(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"CL-23",
      purpose:"Verify whether deployed learning improved future performance.",
      routes:["cl.learning_impact_policy.register", "cl.learning_impact.verify"],
      targetBlock:"CL-24"
    },null,2);
  });
})(window);
