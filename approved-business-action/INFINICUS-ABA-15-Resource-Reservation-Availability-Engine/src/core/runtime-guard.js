(function(global){
  "use strict";
  const ABA=global.INFINICUS?.ABA;
  if(!ABA?.runtime) throw new Error("ABA-01 must be loaded before ABA-15.");
  if(!ABA?.responsibleActorTaskAssignmentEngine){
    throw new Error("ABA-14 must be loaded before ABA-15.");
  }
})(window);
