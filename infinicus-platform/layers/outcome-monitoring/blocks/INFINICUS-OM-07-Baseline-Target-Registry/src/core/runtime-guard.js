(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-07.");
  }

  if(!OM?.dataQualityEvidenceValidationEngine){
    throw new Error("OM-06 must be loaded before OM-07.");
  }

  if(!OM?.metricKPIRegistryEngine){
    throw new Error("OM-03 must be loaded before OM-07.");
  }
})(window);
