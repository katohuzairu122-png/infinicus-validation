(function(global){
  "use strict";

  function validateEnvelope({
    envelope,
    dryRunResult,
    policy,
    queueItem
  }){
    const issues=[];

    if(policy.status!=="active"){
      issues.push("Execution policy is not active.");
    }

    if(policy.requireDryRun && !dryRunResult?.passed){
      issues.push("Dry-run evidence is missing or unsuccessful.");
    }

    if(
      policy.requireIdempotencyKey &&
      !envelope.idempotencyKey
    ){
      issues.push("Idempotency key is required.");
    }

    if(
      policy.requireQueueLease &&
      queueItem &&
      queueItem.state!=="leased"
    ){
      issues.push("Queue item does not have an active lease.");
    }

    if(
      queueItem?.leaseExpiresAt &&
      new Date(queueItem.leaseExpiresAt).getTime() <= Date.now()
    ){
      issues.push("Queue-item lease has expired.");
    }

    if(!envelope.executionAdapterId || !envelope.connectorId){
      issues.push("Execution adapter and connector are required.");
    }

    return {
      valid:issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.controlledExecutionValidator=
    Object.freeze({validateEnvelope});
})(window);
