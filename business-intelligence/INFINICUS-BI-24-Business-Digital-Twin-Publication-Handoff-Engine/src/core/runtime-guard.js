(function(global){
  "use strict";
  const BI=global.INFINICUS?.BI;
  if(!BI?.runtime) throw new Error("BI-01 must be loaded before BI-24.");
  if(!BI?.alertNotificationDistributionEngine){
    throw new Error("BI-23 must be loaded before BI-24.");
  }
})(window);
