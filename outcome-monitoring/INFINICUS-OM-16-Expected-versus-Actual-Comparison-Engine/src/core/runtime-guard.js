(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;
  if(!OM?.runtime) throw new Error("OM-01 must be loaded before OM-16.");
  if(!OM?.externalFactorConfounderEngine){
    throw new Error("OM-15 must be loaded before OM-16.");
  }
})(window);
