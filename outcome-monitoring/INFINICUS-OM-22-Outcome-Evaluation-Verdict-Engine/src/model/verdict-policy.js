(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_VERDICT_POLICY_INVALID",
        "Verdict policy name and code are required."
      );
    }

    return runtime.success({
      outcomeVerdictPolicyId:
        input.outcomeVerdictPolicyId ||
        runtime.createId("om_verdict_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumAuditCompleteness:
        Math.max(0,Math.min(1,Number(input.minimumAuditCompleteness ?? 0.9))),
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.6))),
      minimumReliability:
        Math.max(0,Math.min(1,Number(input.minimumReliability ?? 0.6))),
      adverseMaterialityLimit:
        Math.max(0,Math.min(1,Number(input.adverseMaterialityLimit ?? 0.5))),
      unresolvedCriticalExceptionLimit:
        Math.max(0,Number(input.unresolvedCriticalExceptionLimit ?? 0)),
      requireHumanReviewForConditional:
        input.requireHumanReviewForConditional !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.outcomeVerdictPolicyModel=
    Object.freeze({create});
})(window);
