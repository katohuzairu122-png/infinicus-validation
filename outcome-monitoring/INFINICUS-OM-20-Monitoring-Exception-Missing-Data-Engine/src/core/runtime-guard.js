(function(global){
  "use strict";

  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-20.");
  }

  if(!OM?.adverseOutcomeSideEffectEngine){
    throw new Error("OM-19 must be loaded before OM-20.");
  }
})(window);
