(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_COMPARISON_POLICY_INVALID",
        "Comparison policy name and code are required."
      );
    }

    return runtime.success({
      expectedActualComparisonPolicyId:
        input.expectedActualComparisonPolicyId ||
        runtime.createId("om_comparison_policy"),
      name:String(input.name),
      code:String(input.code),
      achievementThreshold:
        Math.max(0,Math.min(2,Number(input.achievementThreshold ?? 1))),
      acceptableThreshold:
        Math.max(0,Math.min(2,Number(input.acceptableThreshold ?? 0.85))),
      underperformanceThreshold:
        Math.max(0,Math.min(2,Number(input.underperformanceThreshold ?? 0.6))),
      applyConfounderAdjustment:
        input.applyConfounderAdjustment !== false,
      requireCausalContext:
        Boolean(input.requireCausalContext),
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.5))),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.expectedActualComparisonPolicyModel=
    Object.freeze({create});
})(window);
