(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-13.");
  if(!CL?.riskModelLearningEngine) throw new Error("CL-12 must be loaded before CL-13.");
})(window);
