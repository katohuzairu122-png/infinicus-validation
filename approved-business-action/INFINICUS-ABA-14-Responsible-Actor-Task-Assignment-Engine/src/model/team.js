(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_TEAM_INVALID",
        "Team name and code are required."
      );
    }

    return runtime.success({
      teamId:
        input.teamId ||
        runtime.createId("aba_team"),
      name:
        String(input.name),
      code:
        String(input.code),
      actorIds:
        runtime.clone(input.actorIds || []),
      capabilityCodes:
        runtime.clone(input.capabilityCodes || []),
      departmentId:
        input.departmentId || null,
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.teamModel =
    Object.freeze({create});
})(window);
