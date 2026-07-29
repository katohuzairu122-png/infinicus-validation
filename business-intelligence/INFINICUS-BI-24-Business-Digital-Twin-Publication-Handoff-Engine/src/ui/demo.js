(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"BI-24",
      purpose:"Publish governed Business Intelligence state to the Business Digital Twin.",
      package:[
        "financial state",
        "revenue",
        "cost",
        "customers",
        "products",
        "operations",
        "workforce",
        "inventory",
        "liquidity",
        "trends",
        "anomalies",
        "risks",
        "health scores",
        "quality",
        "confidence",
        "lineage"
      ],
      targetBlock:"BI-25"
    },null,2);
  });
})(window);
