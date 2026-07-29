(function(global){
  "use strict";

  const ABA=global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-23.");
  }

  if(!ABA?.actionCompletionVerificationEngine){
    throw new Error("ABA-22 must be loaded before ABA-23.");
  }
})(window);
