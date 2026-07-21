(function(global){
  "use strict";
  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;
    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_SCHEDULE_POLICY_INVALID",
        "Schedule policy name and code are required."
      );
    }
    return runtime.success({
      executionSchedulePolicyId:
        input.executionSchedulePolicyId ||
        runtime.createId("aba_execution_schedule_policy"),
      name:String(input.name),
      code:String(input.code),
      defaultPriority:Number(input.defaultPriority || 50),
      maximumConcurrentTasks:
        Math.max(1,Number(input.maximumConcurrentTasks || 5)),
      retryLimit:Math.max(0,Number(input.retryLimit || 3)),
      retryBackoffSeconds:
        Math.max(1,Number(input.retryBackoffSeconds || 60)),
      leaseSeconds:
        Math.max(30,Number(input.leaseSeconds || 300)),
      allowReschedule:input.allowReschedule !== false,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    });
  }
  global.INFINICUS.ABA.executionSchedulePolicyModel=
    Object.freeze({create});
})(window);
