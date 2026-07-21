(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_VARIANCE_POLICY_INVALID",
        "Variance policy name and code are required."
      );
    }

    return runtime.success({
      varianceThresholdPolicyId:
        input.varianceThresholdPolicyId ||
        runtime.createId("om_variance_policy"),
      name:String(input.name),
      code:String(input.code),
      warningVariancePercent:
        Math.max(0,Number(input.warningVariancePercent ?? 10)),
      criticalVariancePercent:
        Math.max(0,Number(input.criticalVariancePercent ?? 25)),
      progressWarningBelow:
        Math.max(0,Math.min(2,Number(input.progressWarningBelow ?? 0.7))),
      progressCriticalBelow:
        Math.max(0,Math.min(2,Number(input.progressCriticalBelow ?? 0.4))),
      suppressDuplicateMinutes:
        Math.max(0,Number(input.suppressDuplicateMinutes || 60)),
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.5))),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.varianceThresholdPolicyModel=
    Object.freeze({create});
})(window);
