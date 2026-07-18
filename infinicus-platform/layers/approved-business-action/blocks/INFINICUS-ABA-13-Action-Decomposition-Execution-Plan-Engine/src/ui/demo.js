(function(global){
  "use strict";

  global.addEventListener("DOMContentLoaded",()=>{
    document.querySelector("#output").textContent=
      JSON.stringify({
        block:"ABA-13",
        purpose:
          "Convert an approved action into an ordered, controlled execution plan.",
        outputs:[
          "execution tasks",
          "dependencies",
          "parallel groups",
          "milestones",
          "critical path",
          "completion criteria",
          "verification checkpoints",
          "rollback points",
          "ABA-14 handoff"
        ]
      },null,2);
  });
})(window);
