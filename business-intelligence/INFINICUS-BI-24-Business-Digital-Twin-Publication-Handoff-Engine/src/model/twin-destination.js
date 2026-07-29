(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.BI.runtime;

    if(!input.name || !input.destinationType){
      return runtime.failure(
        "BI_TWIN_DESTINATION_INVALID",
        "Destination name and destination type are required."
      );
    }

    return runtime.success({
      twinDestinationId:
        input.twinDestinationId ||
        runtime.createId("bi_twin_destination"),
      name:String(input.name),
      destinationType:String(input.destinationType),
      endpointReference:input.endpointReference || null,
      credentialReference:input.credentialReference || null,
      environment:String(input.environment || "production"),
      region:input.region || null,
      status:String(input.status || "active"),
      healthStatus:String(input.healthStatus || "unknown"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.BI.twinDestinationModel=Object.freeze({create});
})(window);
