(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code || !input.dependencyType){
      return runtime.failure(
        "ABA_DEPENDENCY_INVALID",
        "name, code, and dependencyType are required."
      );
    }

    return runtime.success({
      dependencyId:
        input.dependencyId ||
        runtime.createId("aba_dependency"),
      name:
        String(input.name),
      code:
        String(input.code),
      dependencyType:
        String(input.dependencyType),
      sourceSystem:
        String(input.sourceSystem || "unknown"),
      requiredState:
        String(input.requiredState || "available"),
      expiresAt:
        input.expiresAt || null,
      blocking:
        input.blocking !== false,
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.dependencyModel =
    Object.freeze({create});
})(window);
