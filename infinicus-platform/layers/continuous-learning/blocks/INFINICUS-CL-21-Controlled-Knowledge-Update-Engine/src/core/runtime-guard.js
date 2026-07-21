(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-21.");
  if(!CL?.learningGovernanceApprovalEngine) throw new Error("CL-20 must be loaded before CL-21.");
})(window);
