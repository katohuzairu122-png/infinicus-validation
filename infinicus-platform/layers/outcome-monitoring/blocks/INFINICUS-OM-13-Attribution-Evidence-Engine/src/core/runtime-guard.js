(function(global){
  "use strict";

  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-13.");
  }

  if(!OM?.alertEscalationEngine){
    throw new Error("OM-12 must be loaded before OM-13.");
  }
})(window);
