(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"OM-25",
        purpose:
          "Verify, assemble, diagnose, and deploy the complete Outcome Monitoring layer.",
        layer:{
          blocks:"OM-01 through OM-25",
          inputBoundary:"ABA-24",
          outputBoundary:"Continuous Learning",
          namespace:"window.INFINICUS.OM",
          masterAPI:
            "window.INFINICUS.OM.masterIntegrationEngine"
        },
        deploymentStates:[
          "assembled",
          "deploying",
          "deployed",
          "failed",
          "rolled back"
        ]
      },null,2);
  });
})(window);
