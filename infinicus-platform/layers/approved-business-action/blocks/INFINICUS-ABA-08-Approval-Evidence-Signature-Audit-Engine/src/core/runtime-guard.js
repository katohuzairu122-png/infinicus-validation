(function(global){
  "use strict";
  const ABA=global.INFINICUS?.ABA;
  if(!ABA?.runtime) throw new Error("ABA-01 must be loaded before ABA-08.");
  if(!ABA?.multiStageApprovalWorkflowEngine){
    throw new Error("ABA-07 must be loaded before ABA-08.");
  }
})(window);
