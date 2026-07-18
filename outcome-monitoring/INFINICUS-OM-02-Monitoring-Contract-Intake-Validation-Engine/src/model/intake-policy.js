(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_INTAKE_POLICY_INVALID",
        "Policy name and code are required."
      );
    }

    return runtime.success({
      monitoringContractIntakePolicyId:
        input.monitoringContractIntakePolicyId ||
        runtime.createId("om_intake_policy"),
      name:String(input.name),
      code:String(input.code),
      requireLineage:input.requireLineage !== false,
      requireObservedSources:input.requireObservedSources !== false,
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.6))),
      allowOpenEndedWindow:Boolean(input.allowOpenEndedWindow),
      quarantineInvalid:input.quarantineInvalid !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.monitoringContractIntakePolicyModel=
    Object.freeze({create});
})(window);
