(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-09.");
  if(!CL?.existingKnowledgeComparisonEngine) throw new Error("CL-08 must be loaded before CL-09.");
})(window);
