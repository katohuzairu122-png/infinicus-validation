(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"CL-19",
      purpose:"Generate prioritized, evidence-backed learning recommendations.",
      routes:["cl.learning_recommendation_policy.register", "cl.learning_recommendations.generate"],
      targetBlock:"CL-20"
    },null,2);
  });
})(window);
