(function(global){
  "use strict";

  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-10.");
  }

  if(!OM?.metricNormalizationAggregationEngine){
    throw new Error("OM-09 must be loaded before OM-10.");
  }
})(window);
