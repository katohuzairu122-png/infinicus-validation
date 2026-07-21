(function(global){
  "use strict";
  const BI=global.INFINICUS?.BI;
  if(!BI?.runtime) throw new Error("BI-01 must be loaded before BI-23.");
  if(!BI?.reportingExplorationEngine){
    throw new Error("BI-22 must be loaded before BI-23.");
  }
})(window);
