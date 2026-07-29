(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.ABA.runtime;

    if (
      !input.delegatorActorId ||
      !input.delegateActorId ||
      !input.decisionRightId
    ) {
      return runtime.failure(
        "ABA_DELEGATION_INVALID",
        "delegatorActorId, delegateActorId, and decisionRightId are required."
      );
    }

    return runtime.success({
      delegationId:
        input.delegationId ||
        runtime.createId("aba_delegation"),
      delegatorActorId:
        String(input.delegatorActorId),
      delegateActorId:
        String(input.delegateActorId),
      decisionRightId:
        String(input.decisionRightId),
      reason:
        String(input.reason || ""),
      validFrom:
        input.validFrom || new Date().toISOString(),
      validUntil:
        input.validUntil || null,
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.delegationModel =
    Object.freeze({ create });
})(window);
