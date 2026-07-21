(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_LEARNING_POLICY_INVALID",
        "Learning policy name and code are required."
      );
    }

    return runtime.success({
      learningPackagePolicyId:
        input.learningPackagePolicyId ||
        runtime.createId("om_learning_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.5))),
      minimumReliability:
        Math.max(0,Math.min(1,Number(input.minimumReliability ?? 0.5))),
      allowHypotheses:
        input.allowHypotheses !== false,
      requireLimitations:
        input.requireLimitations !== false,
      requireApplicabilityScope:
        input.requireApplicabilityScope !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.learningPackagePolicyModel=
    Object.freeze({create});
})(window);
