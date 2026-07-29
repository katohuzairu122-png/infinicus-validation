(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"CL-21",
      purpose:"Apply approved learning changes to controlled knowledge stores.",
      routes:["cl.knowledge_update_policy.register", "cl.knowledge_updates.apply"],
      targetBlock:"CL-22"
    },null,2);
  });
})(window);
