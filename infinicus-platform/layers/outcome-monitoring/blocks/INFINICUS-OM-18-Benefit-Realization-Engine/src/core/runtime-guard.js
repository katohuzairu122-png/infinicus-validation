(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;
  if(!OM?.runtime) throw new Error("OM-01 must be loaded before OM-18.");
  if(!OM?.outcomeConfidenceReliabilityEngine){
    throw new Error("OM-17 must be loaded before OM-18.");
  }
})(window);
