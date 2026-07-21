(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerActiveAction(input={}){
    const built =
      global.INFINICUS.ABA.activeActionModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.actionCollisionStore.put(
      "active_actions",
      built.data
    );
  }

  async function analyze({
    conflictAnalysisHandoffId,
    allocations={},
    operations=[]
  }={}){
    const handoff =
      await global.INFINICUS.ABA.constraintDependencyRevalidationEngine
        .getConflictAnalysisHandoff({
          conflictAnalysisHandoffId
        });

    if(!handoff.ok) return handoff;

    const active =
      await global.INFINICUS.ABA.actionCollisionStore
        .listByIndex(
          "active_actions",
          "businessId",
          handoff.data.businessId
        );

    if(!active.ok) return active;

    const candidate={
      actionInstanceId:
        handoff.data.actionInstanceId,
      actionContractId:
        handoff.data.actionContractId,
      businessId:
        handoff.data.businessId,
      actionTypeId:
        handoff.data.actionTypeId,
      actionTypeCode:
        handoff.data.actionTypeCode,
      actionCategoryId:
        handoff.data.actionCategoryId,
      target:
        runtime.clone(handoff.data.target),
      parameters:
        runtime.clone(handoff.data.boundedParameters),
      executionWindow:
        runtime.clone(handoff.data.executionWindow),
      allocations:
        runtime.clone(allocations),
      operations:
        runtime.clone(operations)
    };

    const detection =
      global.INFINICUS.ABA.actionCollisionDetector.detect(
        candidate,
        active.data
      );

    const analysis={
      collisionAnalysisId:
        runtime.createId("aba_collision_analysis"),
      conflictAnalysisHandoffId,
      actionInstanceId:
        candidate.actionInstanceId,
      businessId:
        candidate.businessId,
      candidate:
        runtime.clone(candidate),
      conflictFree:
        detection.conflictFree,
      conflicts:
        runtime.clone(detection.conflicts),
      correlationId:
        handoff.data.correlationId,
      status:
        detection.conflictFree
          ? "clear"
          : "conflicted",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionCollisionStore.put(
      "analyses",
      analysis
    );

    for(const conflict of detection.conflicts){
      await global.INFINICUS.ABA.actionCollisionStore.put(
        "conflicts",
        {
          actionConflictId:
            runtime.createId("aba_action_conflict"),
          collisionAnalysisId:
            analysis.collisionAnalysisId,
          actionInstanceId:
            analysis.actionInstanceId,
          ...runtime.clone(conflict),
          resolutionStatus:
            "unresolved",
          correlationId:
            analysis.correlationId,
          createdAt:
            new Date().toISOString()
        }
      );
    }

    if(!detection.conflictFree){
      await runtime.emit(
        "aba.action_collision.detected",
        analysis
      );

      return runtime.failure(
        "ABA_ACTION_COLLISION_DETECTED",
        "Action conflicts or duplicates were detected.",
        analysis
      );
    }

    const decompositionHandoff={
      actionDecompositionHandoffId:
        runtime.createId("aba_action_decomposition_handoff"),
      targetBlock:
        "ABA-13",
      collisionAnalysisId:
        analysis.collisionAnalysisId,
      revalidationResultId:
        handoff.data.revalidationResultId,
      actionBoundaryId:
        handoff.data.actionBoundaryId,
      actionContractId:
        handoff.data.actionContractId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      actionTypeId:
        handoff.data.actionTypeId,
      actionTypeCode:
        handoff.data.actionTypeCode,
      actionCategoryId:
        handoff.data.actionCategoryId,
      target:
        runtime.clone(handoff.data.target),
      boundedParameters:
        runtime.clone(handoff.data.boundedParameters),
      executionWindow:
        runtime.clone(handoff.data.executionWindow),
      allocations:
        runtime.clone(allocations),
      operations:
        runtime.clone(operations),
      constraints:
        handoff.data.constraints.map(runtime.clone),
      dependencies:
        handoff.data.dependencies.map(runtime.clone),
      riskEvidence:
        handoff.data.riskEvidence.map(runtime.clone),
      expectedOutcomes:
        handoff.data.expectedOutcomes.map(runtime.clone),
      revalidationEvidence:
        runtime.clone(handoff.data.revalidationEvidence),
      collisionEvidence:
        runtime.clone(analysis),
      confidence:
        handoff.data.confidence,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      causationId:
        handoff.data.causationId,
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionCollisionStore.put(
      "decomposition_handoffs",
      decompositionHandoff
    );

    await runtime.emit(
      "aba.action_collision.clear",
      {
        collisionAnalysis:analysis,
        actionDecompositionHandoffId:
          decompositionHandoff.actionDecompositionHandoffId
      }
    );

    return runtime.success({
      collisionAnalysis:analysis,
      actionDecompositionHandoff:decompositionHandoff
    });
  }

  async function resolveConflict({
    actionConflictId,
    resolution,
    resolvedBy
  }={}){
    const conflict =
      await global.INFINICUS.ABA.actionCollisionStore.get(
        "conflicts",
        actionConflictId
      );

    if(!conflict.ok) return conflict;

    const record={
      actionConflictResolutionId:
        runtime.createId("aba_action_conflict_resolution"),
      actionConflictId,
      collisionAnalysisId:
        conflict.data.collisionAnalysisId,
      resolution:
        runtime.clone(resolution || {}),
      resolvedBy:
        String(resolvedBy || "unknown"),
      correlationId:
        conflict.data.correlationId,
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionCollisionStore.put(
      "resolutions",
      record
    );

    const updated={
      ...runtime.clone(conflict.data),
      resolutionStatus:
        "resolved",
      resolvedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionCollisionStore.put(
      "conflicts",
      updated
    );

    await runtime.emit(
      "aba.action_collision.resolved",
      record
    );

    return runtime.success({
      conflict:updated,
      resolution:record
    });
  }

  const api = Object.freeze({
    registerActiveAction,
    analyze,
    resolveConflict,
    getCollisionAnalysis:({collisionAnalysisId}) =>
      global.INFINICUS.ABA.actionCollisionStore.get(
        "analyses",
        collisionAnalysisId
      ),
    getActionDecompositionHandoff:({actionDecompositionHandoffId}) =>
      global.INFINICUS.ABA.actionCollisionStore.get(
        "decomposition_handoffs",
        actionDecompositionHandoffId
      ),
    listConflicts:() =>
      global.INFINICUS.ABA.actionCollisionStore.list(
        "conflicts"
      )
  });

  runtime.registerService(
    "aba.action_collision",
    api,
    {block:"ABA-12"}
  );

  runtime.registerRoute(
    "aba.active_action.register",
    registerActiveAction
  );

  runtime.registerRoute(
    "aba.action_collision.analyze",
    analyze
  );

  runtime.registerRoute(
    "aba.action_collision.resolve",
    resolveConflict
  );

  runtime.registerBlock("ABA-12",{
    name:"Conflict, Duplication and Action Collision Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.actionCollisionEngine =
    api;
})(window);
