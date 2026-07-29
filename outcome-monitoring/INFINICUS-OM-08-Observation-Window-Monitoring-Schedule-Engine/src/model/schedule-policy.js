(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_SCHEDULE_POLICY_INVALID",
        "Schedule policy name and code are required."
      );
    }

    return runtime.success({
      monitoringSchedulePolicyId:
        input.monitoringSchedulePolicyId ||
        runtime.createId("om_schedule_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumCadenceMinutes:
        Math.max(1,Number(input.minimumCadenceMinutes || 15)),
      maximumCadenceMinutes:
        Math.max(1,Number(input.maximumCadenceMinutes || 43200)),
      defaultGraceMinutes:
        Math.max(0,Number(input.defaultGraceMinutes || 60)),
      allowLateObservation:
        input.allowLateObservation !== false,
      allowPause:
        input.allowPause !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.monitoringSchedulePolicyModel=
    Object.freeze({create});
})(window);
