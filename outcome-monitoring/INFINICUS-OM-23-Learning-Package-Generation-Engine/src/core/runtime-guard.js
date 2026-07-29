(function(global){
  "use strict";

  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-23.");
  }

  if(!OM?.outcomeEvaluationVerdictEngine){
    throw new Error("OM-22 must be loaded before OM-23.");
  }
})(window);
