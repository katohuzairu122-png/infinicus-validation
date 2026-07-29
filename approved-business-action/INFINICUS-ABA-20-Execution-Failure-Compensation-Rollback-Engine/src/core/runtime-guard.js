(function(global){
  "use strict";

  const ABA=global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-20.");
  }

  if(!ABA?.controlledActionExecutionEngine){
    throw new Error("ABA-19 must be loaded before ABA-20.");
  }
})(window);
