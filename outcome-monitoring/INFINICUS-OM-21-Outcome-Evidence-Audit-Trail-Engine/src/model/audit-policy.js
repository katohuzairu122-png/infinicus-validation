(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_AUDIT_POLICY_INVALID",
        "Audit policy name and code are required."
      );
    }

    return runtime.success({
      outcomeAuditPolicyId:
        input.outcomeAuditPolicyId ||
        runtime.createId("om_audit_policy"),
      name:String(input.name),
      code:String(input.code),
      requireLineage:
        input.requireLineage !== false,
      requireCorrelationId:
        input.requireCorrelationId !== false,
      minimumCompleteness:
        Math.max(
          0,
          Math.min(
            1,
            Number(input.minimumCompleteness ?? 0.9)
          )
        ),
      hashAlgorithm:String(input.hashAlgorithm || "SHA-256"),
      includeRawEvidence:
        input.includeRawEvidence !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.outcomeAuditPolicyModel=
    Object.freeze({create});
})(window);
