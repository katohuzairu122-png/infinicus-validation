(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code || !input.adapterType){
      return runtime.failure(
        "ABA_EXECUTION_ADAPTER_INVALID",
        "Adapter name, code, and adapterType are required."
      );
    }

    return runtime.success({
      executionAdapterId:
        input.executionAdapterId ||
        runtime.createId("aba_execution_adapter"),
      name:
        String(input.name),
      code:
        String(input.code),
      adapterType:
        String(input.adapterType),
      supportedActionTypeIds:
        runtime.clone(input.supportedActionTypeIds || []),
      supportedTaskCodes:
        runtime.clone(input.supportedTaskCodes || []),
      capabilityCodes:
        runtime.clone(input.capabilityCodes || []),
      supportedRegions:
        runtime.clone(input.supportedRegions || []),
      supportedEnvironments:
        runtime.clone(
          input.supportedEnvironments ||
          ["production","sandbox"]
        ),
      requiresIdempotencyKey:
        input.requiresIdempotencyKey !== false,
      requiresDryRun:
        input.requiresDryRun !== false,
      status:
        String(input.status || "active"),
      healthStatus:
        String(input.healthStatus || "unknown"),
      priority:
        Number(input.priority || 0),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.executionAdapterModel =
    Object.freeze({create});
})(window);
