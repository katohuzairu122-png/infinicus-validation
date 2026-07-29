(function(global){
  "use strict";
  const ABA = global.INFINICUS?.ABA;
  if(!ABA?.runtime) throw new Error("ABA-01 must be loaded before ABA-07.");
  if(!ABA?.approvalPolicyThresholdEngine){
    throw new Error("ABA-06 must be loaded before ABA-07.");
  }
})(window);
