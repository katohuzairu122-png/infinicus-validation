(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-03.");
  }

  if(!OM?.monitoringContractIntakeEngine){
    throw new Error("OM-02 must be loaded before OM-03.");
  }
})(window);
