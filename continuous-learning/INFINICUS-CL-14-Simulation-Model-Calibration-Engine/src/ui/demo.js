(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"CL-14",
      purpose:"Calibrate simulation parameters and distributions.",
      routes:["cl.simulation_calibration_policy.register", "cl.simulations.calibrate"],
      targetBlock:"CL-15"
    },null,2);
  });
})(window);
