(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"CL-04",
        purpose:
          "Classify governed learning evidence into structured taxonomies.",
        supports:[
          "primary category",
          "subcategory",
          "multi-label classification",
          "domain classification",
          "learning-purpose classification",
          "evidence-type separation",
          "unclassified handling"
        ],
        targetBlock:"CL-05"
      },null,2);
  });
})(window);
