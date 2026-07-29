(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    const result=
      global.INFINICUS.CL.runtime.diagnose();

    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"CL-01",
        manifest:global.INFINICUS.CL.manifest,
        diagnostics:result.data
      },null,2);
  });
})(window);
