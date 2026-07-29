(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-24.");
  }

  if(!OM?.learningPackageGenerationEngine){
    throw new Error("OM-23 must be loaded before OM-24.");
  }
})(window);
