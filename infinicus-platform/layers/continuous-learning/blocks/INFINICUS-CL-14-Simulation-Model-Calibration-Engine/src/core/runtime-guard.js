(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;
  if(!CL?.runtime) throw new Error("CL-01 must be loaded before CL-14.");
  if(!CL?.forecastPredictionCalibrationEngine) throw new Error("CL-13 must be loaded before CL-14.");
})(window);
