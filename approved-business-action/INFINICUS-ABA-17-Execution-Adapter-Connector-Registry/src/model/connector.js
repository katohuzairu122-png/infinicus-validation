(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(
      !input.name ||
      !input.code ||
      !input.executionAdapterId
    ){
      return runtime.failure(
        "ABA_CONNECTOR_INVALID",
        "Connector name, code, and executionAdapterId are required."
      );
    }

    return runtime.success({
      connectorId:
        input.connectorId ||
        runtime.createId("aba_connector"),
      executionAdapterId:
        String(input.executionAdapterId),
      name:
        String(input.name),
      code:
        String(input.code),
      endpointReference:
        input.endpointReference || null,
      credentialReference:
        input.credentialReference || null,
      authenticationType:
        String(input.authenticationType || "none"),
      region:
        input.region || null,
      environment:
        String(input.environment || "production"),
      rateLimitPerMinute:
        input.rateLimitPerMinute == null
          ? null
          : Number(input.rateLimitPerMinute),
      timeoutSeconds:
        Math.max(1,Number(input.timeoutSeconds || 30)),
      retryable:
        input.retryable !== false,
      status:
        String(input.status || "active"),
      healthStatus:
        String(input.healthStatus || "unknown"),
      lastHealthCheckAt:
        input.lastHealthCheckAt || null,
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.connectorModel =
    Object.freeze({create});
})(window);
