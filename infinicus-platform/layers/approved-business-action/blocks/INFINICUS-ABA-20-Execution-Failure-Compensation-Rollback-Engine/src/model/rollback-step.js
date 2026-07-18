(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_ROLLBACK_STEP_INVALID",
        "Rollback step name and code are required."
      );
    }

    return runtime.success({
      rollbackStepId:
        input.rollbackStepId ||
        runtime.createId("aba_rollback_step"),
      name:String(input.name),
      code:String(input.code),
      targetExecutionResultId:
        input.targetExecutionResultId || null,
      order:
        Number(input.order || 1),
      rollbackType:
        String(input.rollbackType || "compensation"),
      payload:
        runtime.clone(input.payload || {}),
      reversible:
        input.reversible !== false,
      state:"planned",
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.rollbackStepModel=
    Object.freeze({create});
})(window);
