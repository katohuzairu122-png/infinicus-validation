(function (global) {
  "use strict";

  function create({
    actionInstance,
    fromState,
    toState,
    actorId,
    actorType,
    reason,
    metadata
  }) {
    const runtime = global.INFINICUS.ABA.runtime;

    return runtime.success({
      actionTransitionId:
        runtime.createId("aba_action_transition"),
      actionInstanceId:
        actionInstance.actionInstanceId,
      actionDefinitionId:
        actionInstance.actionDefinitionId,
      businessId:
        actionInstance.businessId,
      fromState,
      toState,
      actorId: actorId || "system",
      actorType: actorType || "system",
      reason: reason || null,
      metadata: runtime.clone(metadata || {}),
      version: actionInstance.version + 1,
      correlationId:
        actionInstance.correlationId,
      occurredAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.actionTransitionModel =
    Object.freeze({ create });
})(window);
