(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;
  if(!OM?.runtime) throw new Error("OM-01 must be loaded before OM-14.");
  if(!OM?.attributionEvidenceEngine){
    throw new Error("OM-13 must be loaded before OM-14.");
  }
})(window);
