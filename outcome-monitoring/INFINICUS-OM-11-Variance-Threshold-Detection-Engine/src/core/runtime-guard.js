(function(global){
  "use strict";

  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-11.");
  }

  if(!OM?.outcomeProgressCalculationEngine){
    throw new Error("OM-10 must be loaded before OM-11.");
  }
})(window);
