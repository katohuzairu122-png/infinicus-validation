(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;
  if(!OM?.runtime) throw new Error("OM-01 must be loaded before OM-15.");
  if(!OM?.causationAssessmentEngine){
    throw new Error("OM-14 must be loaded before OM-15.");
  }
})(window);
