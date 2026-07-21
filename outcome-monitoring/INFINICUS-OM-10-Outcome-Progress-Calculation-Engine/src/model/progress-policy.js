(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_PROGRESS_POLICY_INVALID",
        "Progress policy name and code are required."
      );
    }

    return runtime.success({
      outcomeProgressPolicyId:
        input.outcomeProgressPolicyId ||
        runtime.createId("om_progress_policy"),
      name:String(input.name),
      code:String(input.code),
      completionThreshold:
        Math.max(0,Math.min(2,Number(input.completionThreshold ?? 1))),
      warningThreshold:
        Math.max(0,Math.min(2,Number(input.warningThreshold ?? 0.7))),
      allowOverachievement:
        input.allowOverachievement !== false,
      capProgressAtOne:
        Boolean(input.capProgressAtOne),
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.5))),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.outcomeProgressPolicyModel=
    Object.freeze({create});
})(window);
