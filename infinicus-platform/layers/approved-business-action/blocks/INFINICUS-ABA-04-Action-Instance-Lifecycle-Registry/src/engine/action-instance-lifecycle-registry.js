(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function createInstance({
    actionInstanceHandoffId,
    createdBy,
    expiresAt
  } = {}) {
    const handoff =
      await global.INFINICUS.ABA.actionDefinitionOntologyEngine
        .getActionInstanceHandoff({ actionInstanceHandoffId });

    if (!handoff.ok) return handoff;

    const existing =
      await global.INFINICUS.ABA.actionLifecycleStore
        .getByDefinitionId(handoff.data.actionDefinitionId);

    if (existing.ok) {
      return runtime.success({
        actionInstance: existing.data,
        idempotentReplay: true
      });
    }

    const validation =
      global.INFINICUS.ABA.actionInstanceValidator.validateCreate(
        handoff.data,
        { expiresAt }
      );

    if (!validation.valid) {
      return runtime.failure(
        "ABA_ACTION_INSTANCE_INVALID",
        "Action instance validation failed.",
        validation
      );
    }

    const built =
      global.INFINICUS.ABA.actionInstanceModel.create(
        handoff.data,
        { createdBy, expiresAt }
      );

    if (!built.ok) return built;

    await global.INFINICUS.ABA.actionLifecycleStore.put(
      "instances",
      built.data
    );

    const initialTransition =
      global.INFINICUS.ABA.actionTransitionModel.create({
        actionInstance: { ...built.data, version: 0 },
        fromState: null,
        toState: "draft",
        actorId: createdBy || "system",
        actorType: "system",
        reason: "Action instance created.",
        metadata: {
          actionInstanceHandoffId
        }
      });

    await global.INFINICUS.ABA.actionLifecycleStore.put(
      "transitions",
      initialTransition.data
    );

    await runtime.emit("aba.action_instance.created", {
      actionInstance: built.data
    });

    return runtime.success({
      actionInstance: built.data,
      initialTransition: initialTransition.data
    });
  }

  async function transition({
    actionInstanceId,
    toState,
    actorId,
    actorType,
    reason,
    metadata = {},
    expectedVersion
  } = {}) {
    const current =
      await global.INFINICUS.ABA.actionLifecycleStore.get(
        "instances",
        actionInstanceId
      );

    if (!current.ok) return current;

    const inputValidation =
      global.INFINICUS.ABA.actionInstanceValidator
        .validateTransitionInput({
          currentVersion: current.data.version,
          expectedVersion,
          toState,
          expiresAt: current.data.expiresAt,
          revokedAt: current.data.revokedAt
        });

    if (!inputValidation.valid) {
      return runtime.failure(
        "ABA_ACTION_TRANSITION_INPUT_INVALID",
        "Action transition input validation failed.",
        inputValidation
      );
    }

    const lifecycleValidation =
      runtime.validateTransition(
        current.data.lifecycleName,
        current.data.state,
        toState
      );

    if (!lifecycleValidation.ok) return lifecycleValidation;

    const transitionRecord =
      global.INFINICUS.ABA.actionTransitionModel.create({
        actionInstance: current.data,
        fromState: current.data.state,
        toState,
        actorId,
        actorType,
        reason,
        metadata
      });

    if (!transitionRecord.ok) return transitionRecord;

    const updated = {
      ...runtime.clone(current.data),
      state: toState,
      version: current.data.version + 1,
      updatedAt: new Date().toISOString(),
      revokedAt:
        toState === "revoked"
          ? new Date().toISOString()
          : current.data.revokedAt,
      blockedReason:
        toState === "blocked"
          ? reason || "Action blocked."
          : current.data.blockedReason
    };

    await global.INFINICUS.ABA.actionLifecycleStore.put(
      "instances",
      updated
    );

    await global.INFINICUS.ABA.actionLifecycleStore.put(
      "transitions",
      transitionRecord.data
    );

    let authorityHandoff = null;

    if (toState === "pending_approval") {
      authorityHandoff = {
        authorityHandoffId:
          runtime.createId("aba_authority_handoff"),
        targetBlock: "ABA-05",
        actionInstanceId: updated.actionInstanceId,
        actionDefinitionId: updated.actionDefinitionId,
        businessId: updated.businessId,
        twinId: updated.twinId,
        decisionId: updated.decisionId,
        recommendationId: updated.recommendationId,
        actionTypeId: updated.actionTypeId,
        actionTypeCode: updated.actionTypeCode,
        actionCategoryId: updated.actionCategoryId,
        target: runtime.clone(updated.target),
        parameters: runtime.clone(updated.parameters),
        requiredApprovalClass: updated.requiredApprovalClass,
        reversibility: updated.reversibility,
        constraints: updated.constraints.map(runtime.clone),
        dependencies: updated.dependencies.map(runtime.clone),
        riskEvidence: updated.riskEvidence.map(runtime.clone),
        expectedOutcomes: updated.expectedOutcomes.map(runtime.clone),
        confidence: updated.confidence,
        lineage: updated.lineage.map(runtime.clone),
        correlationId: updated.correlationId,
        causationId: updated.causationId,
        status: "ready",
        createdAt: new Date().toISOString()
      };

      await global.INFINICUS.ABA.actionLifecycleStore.put(
        "authority_handoffs",
        authorityHandoff
      );
    }

    await runtime.emit("aba.action_instance.transitioned", {
      actionInstance: updated,
      transitionRecord: transitionRecord.data,
      authorityHandoffId:
        authorityHandoff?.authorityHandoffId || null
    });

    return runtime.success({
      actionInstance: updated,
      transitionRecord: transitionRecord.data,
      authorityHandoff
    });
  }

  const api = Object.freeze({
    createInstance,
    transition,
    getActionInstance: ({ actionInstanceId }) =>
      global.INFINICUS.ABA.actionLifecycleStore.get(
        "instances",
        actionInstanceId
      ),
    getAuthorityHandoff: ({ authorityHandoffId }) =>
      global.INFINICUS.ABA.actionLifecycleStore.get(
        "authority_handoffs",
        authorityHandoffId
      ),
    listActionTransitions: ({ actionInstanceId }) =>
      global.INFINICUS.ABA.actionLifecycleStore.listTransitions(
        actionInstanceId
      ),
    listActionInstances: () =>
      global.INFINICUS.ABA.actionLifecycleStore.list("instances")
  });

  runtime.registerService(
    "aba.action_instance_lifecycle",
    api,
    { block: "ABA-04" }
  );

  runtime.registerRoute("aba.action_instance.create", createInstance);
  runtime.registerRoute("aba.action_instance.transition", transition);

  runtime.registerBlock("ABA-04", {
    name: "Action Instance and Lifecycle Registry",
    version: "1.0.0",
    status: "active"
  });

  global.INFINICUS.ABA.actionInstanceLifecycleRegistry = api;
})(window);
