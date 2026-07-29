(function(global){
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-17.");
  }

  if(!ABA?.executionSchedulingQueueEngine){
    throw new Error("ABA-16 must be loaded before ABA-17.");
  }
})(window);
