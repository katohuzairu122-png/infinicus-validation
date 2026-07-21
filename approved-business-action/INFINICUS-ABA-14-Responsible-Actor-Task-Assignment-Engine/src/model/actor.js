(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.actorType){
      return runtime.failure(
        "ABA_ACTOR_INVALID",
        "Actor name and actorType are required."
      );
    }

    return runtime.success({
      actorId:
        input.actorId ||
        runtime.createId("aba_actor"),
      name:
        String(input.name),
      actorType:
        String(input.actorType),
      roleIds:
        runtime.clone(input.roleIds || []),
      teamIds:
        runtime.clone(input.teamIds || []),
      capabilityCodes:
        runtime.clone(input.capabilityCodes || []),
      departmentId:
        input.departmentId || null,
      legalEntityId:
        input.legalEntityId || null,
      maximumConcurrentTasks:
        Math.max(1,Number(input.maximumConcurrentTasks || 5)),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.actorModel =
    Object.freeze({create});
})(window);
