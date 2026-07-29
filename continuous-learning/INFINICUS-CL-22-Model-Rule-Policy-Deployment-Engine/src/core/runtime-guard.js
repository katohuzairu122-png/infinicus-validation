(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-22.");
  if(!CL?.controlledKnowledgeUpdateEngine) throw new Error("CL-21 must be loaded before CL-22.");
})(window);
