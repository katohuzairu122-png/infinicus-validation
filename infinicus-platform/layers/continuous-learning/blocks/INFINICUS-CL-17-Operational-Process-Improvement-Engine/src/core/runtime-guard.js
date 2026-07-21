(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-17.");
  if(!CL?.dataQualityObservationLearningEngine) throw new Error("CL-16 must be loaded before CL-17.");
})(window);
