(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;
  if(!OM?.runtime) throw new Error("OM-01 must be loaded before OM-08.");
  if(!OM?.baselineTargetRegistryEngine){
    throw new Error("OM-07 must be loaded before OM-08.");
  }
})(window);
