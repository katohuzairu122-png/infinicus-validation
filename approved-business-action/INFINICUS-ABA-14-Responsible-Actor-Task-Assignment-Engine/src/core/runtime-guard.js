(function(global){
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-14.");
  }

  if(!ABA?.actionDecompositionExecutionPlanEngine){
    throw new Error("ABA-13 must be loaded before ABA-14.");
  }
})(window);
