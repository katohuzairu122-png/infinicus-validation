(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.connectorType){
      return runtime.failure(
        "OM_OBSERVATION_CONNECTOR_INVALID",
        "Connector name and connectorType are required."
      );
    }

    return runtime.success({
      observationConnectorId:
        input.observationConnectorId ||
        runtime.createId("om_observation_connector"),
      name:String(input.name),
      connectorType:String(input.connectorType),
      endpointReference:input.endpointReference || null,
      credentialReference:input.credentialReference || null,
      capabilities:runtime.clone(input.capabilities || []),
      supportedSourceTypes:runtime.clone(input.supportedSourceTypes || []),
      supportedValueTypes:runtime.clone(input.supportedValueTypes || []),
      maximumBatchSize:
        Math.max(1,Number(input.maximumBatchSize || 1000)),
      timeoutMilliseconds:
        Math.max(1000,Number(input.timeoutMilliseconds || 30000)),
      environment:String(input.environment || "production"),
      region:input.region || null,
      status:String(input.status || "active"),
      healthStatus:String(input.healthStatus || "unknown"),
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.observationConnectorModel=
    Object.freeze({create});
})(window);
