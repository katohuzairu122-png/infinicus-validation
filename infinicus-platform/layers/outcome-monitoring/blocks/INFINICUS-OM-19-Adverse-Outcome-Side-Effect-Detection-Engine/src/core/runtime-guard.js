(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;
  if(!OM?.runtime) throw new Error("OM-01 must be loaded before OM-19.");
  if(!OM?.benefitRealizationEngine){
    throw new Error("OM-18 must be loaded before OM-19.");
  }
})(window);
