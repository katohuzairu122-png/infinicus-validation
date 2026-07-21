(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-08.");
  if(!CL?.duplicateConflictContradictionEngine) throw new Error("CL-07 must be loaded before CL-08.");
})(window);
