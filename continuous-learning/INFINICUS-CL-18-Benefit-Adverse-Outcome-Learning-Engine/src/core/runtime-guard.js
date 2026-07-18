(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-18.");
  if(!CL?.operationalProcessImprovementEngine) throw new Error("CL-17 must be loaded before CL-18.");
})(window);
