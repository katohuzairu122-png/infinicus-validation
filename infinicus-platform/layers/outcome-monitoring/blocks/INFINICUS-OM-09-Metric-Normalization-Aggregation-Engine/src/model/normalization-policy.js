(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.OM.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "OM_NORMALIZATION_POLICY_INVALID",
        "Normalization policy name and code are required."
      );
    }

    return runtime.success({
      metricNormalizationPolicyId:
        input.metricNormalizationPolicyId ||
        runtime.createId("om_normalization_policy"),
      name:String(input.name),
      code:String(input.code),
      allowNumericCoercion:
        input.allowNumericCoercion !== false,
      rejectUnknownUnits:
        input.rejectUnknownUnits !== false,
      preservePrecisionDigits:
        Math.max(0,Number(input.preservePrecisionDigits ?? 4)),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.OM.metricNormalizationPolicyModel=
    Object.freeze({create});
})(window);
