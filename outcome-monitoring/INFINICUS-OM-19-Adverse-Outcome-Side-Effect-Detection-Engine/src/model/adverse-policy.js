(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_ADVERSE_POLICY_INVALID",
        "Adverse-outcome policy name and code are required."
      );
    }

    return runtime.success({
      adverseOutcomePolicyId:
        input.adverseOutcomePolicyId ||
        runtime.createId("om_adverse_policy"),
      name:String(input.name),
      code:String(input.code),
      warningMateriality:
        Math.max(0,Math.min(1,Number(input.warningMateriality ?? 0.35))),
      criticalMateriality:
        Math.max(0,Math.min(1,Number(input.criticalMateriality ?? 0.7))),
      requireCausalContext:
        Boolean(input.requireCausalContext),
      requireObservedEvidence:
        input.requireObservedEvidence !== false,
      mitigationThreshold:
        Math.max(0,Math.min(1,Number(input.mitigationThreshold ?? 0.5))),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.adverseOutcomePolicyModel=
    Object.freeze({create});
})(window);
