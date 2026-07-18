(function(global){
  "use strict";

  const ABA=global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-24.");
  }

  if(!ABA?.expectedOutcomeMonitoringContractEngine){
    throw new Error("ABA-23 must be loaded before ABA-24.");
  }
})(window);
