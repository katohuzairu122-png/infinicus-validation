(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-11.");
  if(!CL?.businessRuleLearningEngine) throw new Error("CL-10 must be loaded before CL-11.");
})(window);
