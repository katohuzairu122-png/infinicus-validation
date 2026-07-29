(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-15.");
  if(!CL?.simulationModelCalibrationEngine) throw new Error("CL-14 must be loaded before CL-15.");
})(window);
