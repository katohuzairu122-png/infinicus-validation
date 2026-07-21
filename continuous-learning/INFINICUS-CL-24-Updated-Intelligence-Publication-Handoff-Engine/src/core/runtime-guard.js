(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-24.");
  if(!CL?.learningImpactVerificationEngine) throw new Error("CL-23 must be loaded before CL-24.");
})(window);
