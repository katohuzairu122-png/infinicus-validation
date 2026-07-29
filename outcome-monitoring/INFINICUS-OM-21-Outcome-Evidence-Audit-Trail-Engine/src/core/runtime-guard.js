(function(global){
  "use strict";

  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-21.");
  }

  if(!OM?.monitoringExceptionMissingDataEngine){
    throw new Error("OM-20 must be loaded before OM-21.");
  }
})(window);
