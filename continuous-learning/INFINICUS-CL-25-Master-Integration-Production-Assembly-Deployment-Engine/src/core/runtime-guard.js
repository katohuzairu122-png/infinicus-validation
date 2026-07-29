(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-25.");
  if(!CL?.updatedIntelligencePublicationEngine) throw new Error("CL-24 must be loaded before CL-25.");
})(window);
