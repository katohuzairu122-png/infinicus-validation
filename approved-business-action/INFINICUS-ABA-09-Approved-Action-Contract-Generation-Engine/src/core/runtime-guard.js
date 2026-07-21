(function(global){
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-09.");
  }

  if(!ABA?.approvalEvidenceAuditEngine){
    throw new Error("ABA-08 must be loaded before ABA-09.");
  }
})(window);
