(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-19.");
  if(!CL?.benefitAdverseOutcomeLearningEngine) throw new Error("CL-18 must be loaded before CL-19.");
})(window);
