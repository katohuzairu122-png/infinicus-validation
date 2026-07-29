(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_ALERT_POLICY_INVALID",
        "Alert policy name and code are required."
      );
    }

    return runtime.success({
      alertEscalationPolicyId:
        input.alertEscalationPolicyId ||
        runtime.createId("om_alert_policy"),
      name:String(input.name),
      code:String(input.code),
      routes:runtime.clone(input.routes || {
        warning:{
          ownerRole:"manager",
          acknowledgementMinutes:120,
          escalationStages:[]
        },
        critical:{
          ownerRole:"executive",
          acknowledgementMinutes:30,
          escalationStages:[
            {afterMinutes:30,toRole:"executive"},
            {afterMinutes:60,toRole:"governance"}
          ]
        }
      }),
      suppressDuplicateMinutes:
        Math.max(0,Number(input.suppressDuplicateMinutes || 60)),
      requireAcknowledgement:
        input.requireAcknowledgement !== false,
      requireResolutionEvidence:
        input.requireResolutionEvidence !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.alertEscalationPolicyModel=
    Object.freeze({create});
})(window);
