(function(global){
  "use strict";

  const ABA=global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-22.");
  }

  if(!ABA?.executionEvidenceAuditEngine){
    throw new Error("ABA-21 must be loaded before ABA-22.");
  }
})(window);
