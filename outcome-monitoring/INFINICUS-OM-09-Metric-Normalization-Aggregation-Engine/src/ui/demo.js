(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"OM-09",
      purpose:"Normalize validated observations and create governed metric aggregates.",
      supports:[
        "unit normalization",
        "numeric coercion",
        "sum",
        "average",
        "minimum",
        "maximum",
        "count",
        "weighted average",
        "latest"
      ],
      targetBlock:"OM-10"
    },null,2);
  });
})(window);
