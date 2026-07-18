(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-16.");
  if(!CL?.businessDigitalTwinCalibrationEngine) throw new Error("CL-15 must be loaded before CL-16.");
})(window);
