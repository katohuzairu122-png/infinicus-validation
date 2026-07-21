(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_BENEFIT_POLICY_INVALID",
        "Benefit policy name and code are required."
      );
    }

    return runtime.success({
      benefitRealizationPolicyId:
        input.benefitRealizationPolicyId ||
        runtime.createId("om_benefit_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumConfidence:
        Math.max(0,Math.min(1,Number(input.minimumConfidence ?? 0.6))),
      minimumReliability:
        Math.max(0,Math.min(1,Number(input.minimumReliability ?? 0.6))),
      realizedThreshold:
        Math.max(0,Math.min(2,Number(input.realizedThreshold ?? 1))),
      partialThreshold:
        Math.max(0,Math.min(2,Number(input.partialThreshold ?? 0.5))),
      sustainabilityMinimum:
        Math.max(0,Math.min(1,Number(input.sustainabilityMinimum ?? 0.5))),
      requireCostEvidence:
        input.requireCostEvidence !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.benefitRealizationPolicyModel=
    Object.freeze({create});
})(window);
