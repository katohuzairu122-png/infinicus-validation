(function(global){
  "use strict";
  const ABA = global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-11.");
  }

  if(!ABA?.actionScopeBoundaryEngine){
    throw new Error("ABA-10 must be loaded before ABA-11.");
  }
})(window);
