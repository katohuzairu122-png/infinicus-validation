(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.CL.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "CL_APPLICABILITY_POLICY_INVALID",
        "Applicability policy name and code are required."
      );
    }

    return runtime.success({
      applicabilityPolicyId:
        input.applicabilityPolicyId ||
        runtime.createId("cl_applicability_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumBroadTransferability:
        Math.max(0,Math.min(1,Number(input.minimumBroadTransferability ?? 0.8))),
      minimumConditionalTransferability:
        Math.max(0,Math.min(1,Number(input.minimumConditionalTransferability ?? 0.55))),
      minimumRestrictedTransferability:
        Math.max(0,Math.min(1,Number(input.minimumRestrictedTransferability ?? 0.3))),
      requireContextEvidence:
        input.requireContextEvidence !== false,
      requiredDimensions:
        runtime.clone(
          input.requiredDimensions || [
            "businessType",
            "market",
            "geography",
            "scale",
            "customerSegment",
            "channel",
            "operatingModel",
            "timeHorizon"
          ]
        ),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.CL.applicabilityPolicyModel=
    Object.freeze({create});
})(window);
