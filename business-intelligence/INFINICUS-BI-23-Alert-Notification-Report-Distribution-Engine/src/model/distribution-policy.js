(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.BI.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "BI_DISTRIBUTION_POLICY_INVALID",
        "Policy name and code are required."
      );
    }

    return runtime.success({
      distributionPolicyId:
        input.distributionPolicyId ||
        runtime.createId("bi_distribution_policy"),
      name:String(input.name),
      code:String(input.code),
      minimumSeverity:String(input.minimumSeverity || "information"),
      allowedChannelCodes:runtime.clone(input.allowedChannelCodes || []),
      acknowledgementRequired:Boolean(input.acknowledgementRequired),
      acknowledgementDeadlineMinutes:
        Math.max(1,Number(input.acknowledgementDeadlineMinutes || 120)),
      maximumAttempts:
        Math.max(1,Number(input.maximumAttempts || 3)),
      retryBackoffSeconds:
        Math.max(1,Number(input.retryBackoffSeconds || 60)),
      escalationAudienceIds:
        runtime.clone(input.escalationAudienceIds || []),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.BI.distributionPolicyModel=Object.freeze({create});
})(window);
