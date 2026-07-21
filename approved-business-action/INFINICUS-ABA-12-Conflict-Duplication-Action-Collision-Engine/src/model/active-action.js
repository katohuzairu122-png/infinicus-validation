(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(
      !input.actionInstanceId ||
      !input.actionTypeId ||
      !input.businessId
    ){
      return runtime.failure(
        "ABA_ACTIVE_ACTION_INVALID",
        "actionInstanceId, actionTypeId, and businessId are required."
      );
    }

    return runtime.success({
      activeActionId:
        input.activeActionId ||
        runtime.createId("aba_active_action"),
      actionInstanceId:
        String(input.actionInstanceId),
      actionContractId:
        input.actionContractId || null,
      businessId:
        String(input.businessId),
      actionTypeId:
        String(input.actionTypeId),
      actionTypeCode:
        String(input.actionTypeCode || ""),
      actionCategoryId:
        input.actionCategoryId || null,
      target:
        runtime.clone(input.target || {}),
      parameters:
        runtime.clone(input.parameters || {}),
      executionWindow:
        runtime.clone(input.executionWindow || {}),
      allocations:
        runtime.clone(input.allocations || {}),
      operations:
        runtime.clone(input.operations || []),
      state:
        String(input.state || "scheduled"),
      correlationId:
        input.correlationId || null,
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.activeActionModel =
    Object.freeze({create});
})(window);
