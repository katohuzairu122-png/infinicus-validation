(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_EXCEPTION_POLICY_INVALID",
        "Exception policy name and code are required."
      );
    }

    return runtime.success({
      monitoringExceptionPolicyId:
        input.monitoringExceptionPolicyId ||
        runtime.createId("om_exception_policy"),
      name:String(input.name),
      code:String(input.code),
      missingCheckpointWarningCount:
        Math.max(1,Number(input.missingCheckpointWarningCount || 1)),
      missingCheckpointCriticalCount:
        Math.max(1,Number(input.missingCheckpointCriticalCount || 3)),
      staleMinutesWarning:
        Math.max(1,Number(input.staleMinutesWarning || 120)),
      staleMinutesCritical:
        Math.max(1,Number(input.staleMinutesCritical || 1440)),
      minimumEvidenceCompleteness:
        Math.max(
          0,
          Math.min(
            1,
            Number(input.minimumEvidenceCompleteness ?? 0.8)
          )
        ),
      allowWaiver:Boolean(input.allowWaiver),
      requireRemediation:
        input.requireRemediation !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.monitoringExceptionPolicyModel=
    Object.freeze({create});
})(window);
