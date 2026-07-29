(function(global){
  "use strict";

  const ABA = global.INFINICUS?.ABA;

  if(!ABA?.runtime){
    throw new Error("ABA-01 must be loaded before ABA-18.");
  }

  if(!ABA?.executionAdapterConnectorRegistry){
    throw new Error("ABA-17 must be loaded before ABA-18.");
  }
})(window);
