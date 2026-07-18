(function(global){
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-13.");
  }

  if(!ABA?.actionCollisionEngine){
    throw new Error("ABA-12 must be loaded before ABA-13.");
  }
})(window);
