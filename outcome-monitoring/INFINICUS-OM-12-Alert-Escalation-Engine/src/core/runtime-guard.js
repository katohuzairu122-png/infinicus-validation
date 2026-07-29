(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-12.");
  }

  if(!OM?.varianceThresholdDetectionEngine){
    throw new Error("OM-11 must be loaded before OM-12.");
  }
})(window);
