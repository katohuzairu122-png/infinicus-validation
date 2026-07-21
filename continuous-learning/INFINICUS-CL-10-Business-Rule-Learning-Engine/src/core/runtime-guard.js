(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-10.");
  if(!CL?.assumptionValidationRevisionEngine) throw new Error("CL-09 must be loaded before CL-10.");
})(window);
