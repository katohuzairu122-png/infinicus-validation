(function (global) {
  "use strict";

  const runtime =
    global.INFINICUS.DT.runtime;

  async function registerPolicy(
    input = {}
  ) {
    const built =
      global.INFINICUS.DT
        .synchronizationPolicyModel
        .create(input);

    if (!built.ok) return built;

    return global.INFINICUS.DT
      .synchronizationStore
      .put(
        "policies",
        built.data
      );
  }

  async function synchronize({
    syncHandoffId,
    synchronizationPolicyId
  } = {}) {
    const handoff =
      await global.INFINICUS.DT
        .marketCompetitiveTwinEngine
        .getSyncHandoff({
          syncHandoffId
        });

    if (!handoff.ok) return handoff;

    const policy =
      await global.INFINICUS.DT
        .synchronizationStore
        .get(
          "policies",
          synchronizationPolicyId
        );

    if (!policy.ok) return policy;

    const existingRuns =
      await global.INFINICUS.DT
        .synchronizationStore
        .get(
          "sync_runs",
          syncHandoffId
        );

    if (existingRuns.ok) {
      return runtime.success({
        synchronizationRun:
          existingRuns.data,
        idempotentReplay:
          true
      });
    }

    const domains = {
      market:
        handoff.data.marketState,
      asset:
        handoff.data.assetState,
      workforce:
        handoff.data.workforceState,
      inventory:
        handoff.data.inventoryContext,
      operations:
        handoff.data.operationsContext,
      source:
        handoff.data.sourceContext
    };

    const incomingStates = [];

    for (
      const [domain, value]
      of Object.entries(domains)
    ) {
      incomingStates.push(
        ...global.INFINICUS.DT
          .stateNormalizer
          .flattenDomain(
            domain,
            value
          )
      );
    }

    const applied = [];
    const retained = [];
    const conflicts = [];
    const rejected = [];

    for (const incoming of incomingStates) {
      if (
        policy.data
          .rejectSimulatedState &&
        incoming.sourceType ===
          "simulated"
      ) {
        rejected.push({
          ...runtime.clone(incoming),
          reason:
            "simulated_state_rejected"
        });

        continue;
      }

      if (
        Number(
          incoming.confidence || 0
        ) <
        policy.data.minimumConfidence
      ) {
        rejected.push({
          ...runtime.clone(incoming),
          reason:
            "confidence_below_policy"
        });

        continue;
      }

      const current =
        await global.INFINICUS.DT
          .synchronizationStore
          .getState(
            handoff.data.twinId,
            incoming.stateKey
          );

      const currentRecord =
        current.ok
          ? current.data
          : null;

      const conflict =
        global.INFINICUS.DT
          .stateConflictDetector
          .detect({
            current:
              currentRecord,
            incoming,
            policy:
              policy.data
          });

      if (conflict.conflict) {
        const conflictRecord = {
          stateConflictId:
            runtime.createId(
              "dt_state_conflict"
            ),
          syncHandoffId,
          twinId:
            handoff.data.twinId,
          stateKey:
            incoming.stateKey,
          currentState:
            runtime.clone(
              currentRecord
            ),
          incomingState:
            runtime.clone(
              incoming
            ),
          reason:
            conflict.reason,
          status:
            "manual_review_required",
          createdAt:
            new Date().toISOString()
        };

        conflicts.push(
          conflictRecord
        );

        await global.INFINICUS.DT
          .synchronizationStore
          .put(
            "conflicts",
            conflictRecord
          );

        continue;
      }

      const selection =
        global.INFINICUS.DT
          .stateSelector
          .choose(
            currentRecord,
            incoming,
            policy.data
          );

      if (
        selection.selected ===
        currentRecord
      ) {
        retained.push({
          stateKey:
            incoming.stateKey,
          reason:
            selection.reason
        });

        continue;
      }

      const stateRecord = {
        businessStateRecordId:
          currentRecord
            ?.businessStateRecordId ||
          runtime.createId(
            "dt_business_state"
          ),
        twinId:
          handoff.data.twinId,
        businessId:
          handoff.data.businessId,
        twinStateKey:
          `${handoff.data.twinId}|${incoming.stateKey}`,
        stateKey:
          incoming.stateKey,
        value:
          runtime.clone(
            incoming.value
          ),
        sourceType:
          incoming.sourceType,
        confidence:
          incoming.confidence,
        observedAt:
          incoming.observedAt,
        lineage:
          runtime.clone(
            incoming.lineage
          ),
        version:
          Number(
            currentRecord?.version || 0
          ) + 1,
        supersededValue:
          currentRecord
            ? runtime.clone(
                currentRecord.value
              )
            : null,
        supersededAt:
          currentRecord
            ? new Date().toISOString()
            : null,
        synchronizationPolicyId,
        syncHandoffId,
        correlationId:
          handoff.data.correlationId,
        updatedAt:
          new Date().toISOString()
      };

      await global.INFINICUS.DT
        .synchronizationStore
        .put(
          "states",
          stateRecord
        );

      applied.push(
        stateRecord
      );
    }

    const synchronizationRun = {
      synchronizationRunId:
        syncHandoffId,
      syncHandoffId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      synchronizationPolicyId,
      incomingStateCount:
        incomingStates.length,
      appliedCount:
        applied.length,
      retainedCount:
        retained.length,
      conflictCount:
        conflicts.length,
      rejectedCount:
        rejected.length,
      status:
        conflicts.length
          ? "completed_with_conflicts"
          : "completed",
      correlationId:
        handoff.data.correlationId,
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .synchronizationStore
      .put(
        "sync_runs",
        synchronizationRun
      );

    const synchronizedState =
      await global.INFINICUS.DT
        .synchronizationStore
        .listByTwin(
          handoff.data.twinId
        );

    if (!synchronizedState.ok) {
      return synchronizedState;
    }

    const transitionHandoff = {
      transitionHandoffId:
        runtime.createId(
          "dt_transition_handoff"
        ),
      targetBlock: "DT-17",
      synchronizationRunId:
        synchronizationRun
          .synchronizationRunId,
      syncHandoffId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      synchronizedState:
        synchronizedState.data
          .map(runtime.clone),
      appliedChanges:
        applied.map(runtime.clone),
      retainedState:
        retained.map(runtime.clone),
      conflicts:
        conflicts.map(runtime.clone),
      rejectedState:
        rejected.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.DT
      .synchronizationStore
      .put(
        "transition_handoffs",
        transitionHandoff
      );

    await runtime.emit(
      "dt.business_state.synchronized",
      {
        synchronizationRun,
        transitionHandoffId:
          transitionHandoff.transitionHandoffId
      }
    );

    return runtime.success({
      synchronizationRun,
      applied,
      retained,
      conflicts,
      rejected,
      synchronizedState:
        synchronizedState.data,
      transitionHandoff
    });
  }

  const api = Object.freeze({
    registerPolicy,
    synchronize,
    getSynchronizationRun: ({
      synchronizationRunId
    }) =>
      global.INFINICUS.DT
        .synchronizationStore
        .get(
          "sync_runs",
          synchronizationRunId
        ),
    getTransitionHandoff: ({
      transitionHandoffId
    }) =>
      global.INFINICUS.DT
        .synchronizationStore
        .get(
          "transition_handoffs",
          transitionHandoffId
        ),
    getSynchronizedState: ({
      twinId,
      stateKey
    }) =>
      global.INFINICUS.DT
        .synchronizationStore
        .getState(
          twinId,
          stateKey
        ),
    listTwinSynchronizedState: ({
      twinId
    }) =>
      global.INFINICUS.DT
        .synchronizationStore
        .listByTwin(
          twinId
        )
  });

  runtime.registerService(
    "dt.business_state_synchronization",
    api,
    { block: "DT-16" }
  );

  runtime.registerRoute(
    "dt.synchronization_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "dt.business_state.synchronize",
    synchronize
  );

  global.INFINICUS.DT
    .businessStateSynchronizationEngine =
      api;
})(window);
