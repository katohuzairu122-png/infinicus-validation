(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"OM-03",
      purpose:"Register governed metrics and KPIs from validated monitoring contracts.",
      governs:[
        "metric code",
        "value type",
        "unit",
        "aggregation",
        "direction",
        "formula",
        "baseline",
        "target",
        "tolerance",
        "source binding",
        "version",
        "status"
      ],
      targetBlock:"OM-04"
    },null,2);
  });
})(window);
