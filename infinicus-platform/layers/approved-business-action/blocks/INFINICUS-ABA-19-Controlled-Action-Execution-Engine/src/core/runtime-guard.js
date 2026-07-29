(function(global){
  "use strict";
  const ABA=global.INFINICUS?.ABA;
  if(!ABA?.runtime) throw new Error("ABA-01 must be loaded before ABA-19.");
  if(!ABA?.preExecutionDryRunEngine){
    throw new Error("ABA-18 must be loaded before ABA-19.");
  }
})(window);
