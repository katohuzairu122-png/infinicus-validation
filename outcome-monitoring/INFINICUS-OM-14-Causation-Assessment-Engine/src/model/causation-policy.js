(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_CAUSATION_POLICY_INVALID",
        "Causation policy name and code are required."
      );
    }

    return runtime.success({
      causationPolicyId:
        input.causationPolicyId ||
        runtime.createId("om_causation_policy"),
      name:String(input.name),
      code:String(input.code),
      weights:runtime.clone(input.weights || {
        temporalOrder:0.2,
        mechanism:0.2,
        doseResponse:0.15,
        counterfactual:0.2,
        reproducibility:0.15,
        attributionStrength:0.1
      }),
      confounderPenaltyWeight:
        Math.max(0,Math.min(1,Number(input.confounderPenaltyWeight ?? 0.35))),
      alternativeExplanationPenaltyWeight:
        Math.max(0,Math.min(1,Number(input.alternativeExplanationPenaltyWeight ?? 0.25))),
      minimumPlausibleCausation:
        Math.max(0,Math.min(1,Number(input.minimumPlausibleCausation ?? 0.6))),
      minimumStrongCausation:
        Math.max(0,Math.min(1,Number(input.minimumStrongCausation ?? 0.8))),
      requireTemporalOrder:
        input.requireTemporalOrder !== false,
      requireCounterfactual:
        Boolean(input.requireCounterfactual),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.causationPolicyModel=
    Object.freeze({create});
})(window);
