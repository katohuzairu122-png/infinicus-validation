(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-04.");
  }

  if(!OM?.metricKPIRegistryEngine){
    throw new Error("OM-03 must be loaded before OM-04.");
  }
})(window);
