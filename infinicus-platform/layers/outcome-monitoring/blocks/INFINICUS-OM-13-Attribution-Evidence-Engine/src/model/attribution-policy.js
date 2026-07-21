(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_ATTRIBUTION_POLICY_INVALID",
        "Attribution policy name and code are required."
      );
    }

    return runtime.success({
      attributionPolicyId:
        input.attributionPolicyId ||
        runtime.createId("om_attribution_policy"),
      name:String(input.name),
      code:String(input.code),
      weights:runtime.clone(input.weights || {
        timing:0.2,
        scope:0.2,
        exposure:0.2,
        mechanism:0.15,
        counterfactual:0.15,
        alternativeExplanations:0.1
      }),
      minimumSufficientEvidence:
        Math.max(0,Math.min(1,Number(input.minimumSufficientEvidence ?? 0.6))),
      minimumStrongAttribution:
        Math.max(0,Math.min(1,Number(input.minimumStrongAttribution ?? 0.75))),
      requireActionIdentity:
        input.requireActionIdentity !== false,
      requireCounterfactual:
        Boolean(input.requireCounterfactual),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.attributionPolicyModel=
    Object.freeze({create});
})(window);
