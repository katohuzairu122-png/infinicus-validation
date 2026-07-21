(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;
  if(!OM?.runtime) throw new Error("OM-01 must be loaded before OM-09.");
  if(!OM?.observationWindowScheduleEngine){
    throw new Error("OM-08 must be loaded before OM-09.");
  }
})(window);
