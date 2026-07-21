(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-06.");
  }

  if(!OM?.observationCollectionEngine){
    throw new Error("OM-05 must be loaded before OM-06.");
  }
})(window);
