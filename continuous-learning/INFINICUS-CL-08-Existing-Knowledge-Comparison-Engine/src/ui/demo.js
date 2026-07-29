(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"CL-08",
      purpose:"Compare governed learning against existing enterprise knowledge.",
      routes:["cl.knowledge_comparison_policy.register", "cl.existing_knowledge.compare"],
      targetBlock:"CL-09"
    },null,2);
  });
})(window);
