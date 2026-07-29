(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;
  if(!OM?.runtime) throw new Error("OM-01 must be loaded before OM-17.");
  if(!OM?.expectedActualComparisonEngine){
    throw new Error("OM-16 must be loaded before OM-17.");
  }
})(window);
