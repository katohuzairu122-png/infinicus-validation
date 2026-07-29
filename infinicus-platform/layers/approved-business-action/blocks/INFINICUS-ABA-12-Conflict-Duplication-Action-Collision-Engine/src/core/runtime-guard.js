(function(global){
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-12.");
  }

  if(!ABA?.constraintDependencyRevalidationEngine){
    throw new Error("ABA-11 must be loaded before ABA-12.");
  }
})(window);
