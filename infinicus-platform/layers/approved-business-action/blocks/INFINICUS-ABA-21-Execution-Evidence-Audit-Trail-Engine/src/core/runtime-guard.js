(function(global){
  "use strict";

  const ABA=global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-21.");
  }

  if(!ABA?.executionFailureRollbackEngine){
    throw new Error("ABA-20 must be loaded before ABA-21.");
  }
})(window);
