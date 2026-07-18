(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_DRY_RUN_POLICY_INVALID",
        "Dry-run policy name and code are required."
      );
    }

    return runtime.success({
      dryRunPolicyId:
        input.dryRunPolicyId ||
        runtime.createId("aba_dry_run_policy"),
      name:
        String(input.name),
      code:
        String(input.code),
      allowedEnvironments:
        runtime.clone(
          input.allowedEnvironments ||
          ["sandbox","validation"]
        ),
      requireIdempotencyKey:
        input.requireIdempotencyKey !== false,
      prohibitSideEffects:
        input.prohibitSideEffects !== false,
      maximumTimeoutSeconds:
        Math.max(1,Number(input.maximumTimeoutSeconds || 30)),
      maximumRetryLimit:
        Math.max(0,Number(input.maximumRetryLimit || 3)),
      requiredResponseFields:
        runtime.clone(input.requiredResponseFields || []),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.dryRunPolicyModel =
    Object.freeze({create});
})(window);
