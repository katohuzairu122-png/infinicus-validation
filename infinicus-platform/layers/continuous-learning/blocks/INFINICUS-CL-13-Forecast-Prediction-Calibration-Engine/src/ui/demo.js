(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"CL-13",
      purpose:"Calibrate forecast and prediction models using realized outcomes.",
      routes:["cl.forecast_calibration_policy.register", "cl.forecasts.calibrate"],
      targetBlock:"CL-14"
    },null,2);
  });
})(window);
