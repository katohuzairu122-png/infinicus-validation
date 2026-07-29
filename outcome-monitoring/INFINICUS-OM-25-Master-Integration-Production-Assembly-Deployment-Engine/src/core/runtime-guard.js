(function(global){
  "use strict";

  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-25.");
  }

  if(!OM?.continuousLearningPublicationEngine){
    throw new Error("OM-24 must be loaded before OM-25.");
  }
})(window);
