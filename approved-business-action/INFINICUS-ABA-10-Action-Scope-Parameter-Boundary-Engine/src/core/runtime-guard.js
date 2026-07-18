(function(global){
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-10.");
  }

  if(!ABA?.approvedActionContractEngine){
    throw new Error("ABA-09 must be loaded before ABA-10.");
  }
})(window);
