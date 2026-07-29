(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-20.");
  if(!CL?.learningRecommendationGenerationEngine) throw new Error("CL-19 must be loaded before CL-20.");
})(window);
