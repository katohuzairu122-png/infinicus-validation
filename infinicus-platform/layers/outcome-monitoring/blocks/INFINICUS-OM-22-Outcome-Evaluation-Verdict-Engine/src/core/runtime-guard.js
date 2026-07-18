(function(global){
  "use strict";

  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-22.");
  }

  if(!OM?.outcomeEvidenceAuditTrailEngine){
    throw new Error("OM-21 must be loaded before OM-22.");
  }
})(window);
