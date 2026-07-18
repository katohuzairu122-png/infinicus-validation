(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.name || !input.destinationType){
      return runtime.failure(
        "ABA_MONITORING_DESTINATION_INVALID",
        "Destination name and destinationType are required."
      );
    }

    return runtime.success({
      monitoringDestinationId:
        input.monitoringDestinationId ||
        runtime.createId("aba_monitoring_destination"),
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

  global.INFINICUS.ABA.monitoringDestinationModel=
    Object.freeze({create});
})(window);
