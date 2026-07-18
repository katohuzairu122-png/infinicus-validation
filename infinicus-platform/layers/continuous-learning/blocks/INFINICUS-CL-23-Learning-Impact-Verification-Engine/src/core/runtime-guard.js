(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-23.");
  if(!CL?.modelRulePolicyDeploymentEngine) throw new Error("CL-22 must be loaded before CL-23.");
})(window);
