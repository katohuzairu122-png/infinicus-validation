(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"CL-06",
        purpose:
          "Rate learning confidence and reliability before knowledge or model updates.",
        dimensions:[
          "evidence confidence",
          "evidence reliability",
          "classification confidence",
          "applicability confidence",
          "provenance completeness",
          "lineage completeness"
        ],
        penalties:[
          "limitations",
          "scope restrictions",
          "unclassified evidence"
        ],
        eligibility:[
          "eligible",
          "review required",
          "ineligible"
        ],
        targetBlock:"CL-07"
      },null,2);
  });
})(window);
