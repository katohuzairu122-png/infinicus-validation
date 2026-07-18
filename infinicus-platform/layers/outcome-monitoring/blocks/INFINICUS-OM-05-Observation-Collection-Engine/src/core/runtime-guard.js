(function(global){
  "use strict";
  const OM=global.INFINICUS?.OM;

  if(!OM?.runtime){
    throw new Error("OM-01 must be loaded before OM-05.");
  }

  if(!OM?.observationSourceConnectorRegistryEngine){
    throw new Error("OM-04 must be loaded before OM-05.");
  }
})(window);
