(function(global){
  "use strict";
  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=JSON.stringify({
      block:"ABA-07",
      purpose:"Create and operate governed multi-stage approval workflows.",
      modes:["sequential","parallel","majority","unanimous","conditional"],
      controls:["deadlines","delegation","escalation","stage progression","immutable task history"],
      targetBlock:"ABA-08"
    },null,2);
  });
})(window);
