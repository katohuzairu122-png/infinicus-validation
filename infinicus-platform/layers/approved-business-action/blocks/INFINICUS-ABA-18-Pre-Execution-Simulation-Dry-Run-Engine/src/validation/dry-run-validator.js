(function(global){
  "use strict";

  function getByPath(object,path){
    return path
      .split(".")
      .reduce(
        (value,key) =>
          value == null ? undefined : value[key],
        object
      );
  }

  function validateEnvelope(envelope,policy){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Dry-run policy is not active.");
    }

    if(
      !policy.allowedEnvironments.includes(
        envelope.environment
      )
    ){
      issues.push("Execution environment is not allowed for dry run.");
    }

    if(
      policy.requireIdempotencyKey &&
      !envelope.idempotencyKey
    ){
      issues.push("Idempotency key is required.");
    }

    if(
      policy.prohibitSideEffects &&
      envelope.allowSideEffects===true
    ){
      issues.push("Side effects are prohibited during dry run.");
    }

    if(
      Number(envelope.timeoutSeconds || 0) >
      policy.maximumTimeoutSeconds
    ){
      issues.push("Invocation timeout exceeds dry-run policy.");
    }

    if(!envelope.executionAdapterId || !envelope.connectorId){
      issues.push("Adapter and connector references are required.");
    }

    if(
      !envelope.credentialReference &&
      envelope.authenticationType !== "none"
    ){
      issues.push("Credential reference is required for authenticated connector.");
    }

    return {
      valid:
        issues.length===0,
      issues
    };
  }

  function validateResponse(response,policy){
    const issues=[];

    for(const path of policy.requiredResponseFields){
      if(getByPath(response,path)===undefined){
        issues.push(`Required response field is missing: ${path}`);
      }
    }

    return {
      valid:
        issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.dryRunValidator =
    Object.freeze({
      getByPath,
      validateEnvelope,
      validateResponse
    });
})(window);
