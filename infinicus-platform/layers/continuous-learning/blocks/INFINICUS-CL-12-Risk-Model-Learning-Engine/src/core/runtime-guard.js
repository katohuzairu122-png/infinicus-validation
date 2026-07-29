(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-12.");
  if(!CL?.decisionPolicyLearningEngine) throw new Error("CL-11 must be loaded before CL-12.");
})(window);
