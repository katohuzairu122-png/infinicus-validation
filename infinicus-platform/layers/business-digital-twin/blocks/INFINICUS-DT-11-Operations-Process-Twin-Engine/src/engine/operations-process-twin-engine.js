(function (global) {
  "use strict";

  const runtime = global.INFINICUS.DT.runtime;

  async function buildOperationsProcessState({
    operationsHandoffId,
    processInputs = [],
    stageInputs = [],
    resourceInputs = [],
    workItemInputs = []
  } = {}) {
    const handoff = await global.INFINICUS.DT
      .marketingAcquisitionTwinEngine
      .getOperationsHandoff({ operationsHandoffId });

    if (!handoff.ok) return handoff;

    const processes = [];
    for (const input of processInputs) {
      const built = global.INFINICUS.DT.processModel.createProcess({
        ...input,
        twinId: handoff.data.twinId
      });
      if (!built.ok) return built;
      processes.push(built.data);
      await global.INFINICUS.DT.operationsStore.put("processes", built.data);
    }

    const stages = [];
    for (const input of stageInputs) {
      const built = global.INFINICUS.DT.processModel.createStage({
        ...input,
        twinId: handoff.data.twinId
      });
      if (!built.ok) return built;
      stages.push(built.data);
    }

    const resources = [];
    for (const input of resourceInputs) {
      const built = global.INFINICUS.DT.resourceWorkItemModel.createResource({
        ...input,
        twinId: handoff.data.twinId
      });
      if (!built.ok) return built;
      resources.push(built.data);
    }

    const workItems = [];
    for (const input of workItemInputs) {
      const built = global.INFINICUS.DT.resourceWorkItemModel.createWorkItem({
        ...input,
        twinId: handoff.data.twinId
      });
      if (!built.ok) return built;
      workItems.push(built.data);
    }

    const validation = global.INFINICUS.DT.operationsValidator.validate({
      processes, stages, resources, workItems
    });

    if (!validation.valid) {
      return runtime.failure(
        "OPERATIONS_PROCESS_STATE_INVALID",
        "Operations and process validation failed.",
        validation
      );
    }

    for (const stage of stages) {
      await global.INFINICUS.DT.operationsStore.put("stages", stage);
    }
    for (const resource of resources) {
      await global.INFINICUS.DT.operationsStore.put("resources", resource);
    }
    for (const item of workItems) {
      await global.INFINICUS.DT.operationsStore.put("work_items", item);
    }

    const analysis = global.INFINICUS.DT.operationsAnalyzer.analyze({
      stages, resources, workItems
    });

    const snapshot = {
      operationsSnapshotId: runtime.createId("dt_operations_snapshot"),
      operationsHandoffId,
      businessId: handoff.data.businessId,
      twinId: handoff.data.twinId,
      processes: processes.map(runtime.clone),
      stages: stages.map(runtime.clone),
      resources: resources.map(runtime.clone),
      workItems: workItems.map(runtime.clone),
      analysis: runtime.clone(analysis),
      marketingAnalysis: runtime.clone(handoff.data.marketingAnalysis),
      salesAnalysis: runtime.clone(handoff.data.salesAnalysis),
      status: "current",
      createdAt: new Date().toISOString()
    };

    await global.INFINICUS.DT.operationsStore.put("snapshots", snapshot);

    const inventoryHandoff = {
      inventoryHandoffId: runtime.createId("dt_inventory_handoff"),
      targetBlock: "DT-12",
      operationsSnapshotId: snapshot.operationsSnapshotId,
      marketingSnapshotId: handoff.data.marketingSnapshotId,
      salesRevenueSnapshotId: handoff.data.salesRevenueSnapshotId,
      customerDemandSnapshotId: handoff.data.customerDemandSnapshotId,
      financialSnapshotId: handoff.data.financialSnapshotId,
      businessId: snapshot.businessId,
      twinId: snapshot.twinId,
      processes: processes.map(runtime.clone),
      stages: stages.map(runtime.clone),
      resources: resources.map(runtime.clone),
      workItems: workItems.map(runtime.clone),
      operationsAnalysis: runtime.clone(analysis),
      orders: handoff.data.orders.map(runtime.clone),
      customerProfiles: handoff.data.customerProfiles.map(runtime.clone),
      customerSegments: handoff.data.customerSegments.map(runtime.clone),
      financialProfile: runtime.clone(handoff.data.financialProfile),
      sourceContext: runtime.clone(handoff.data.sourceContext),
      correlationId: handoff.data.correlationId,
      status: "ready",
      createdAt: new Date().toISOString()
    };

    await global.INFINICUS.DT.operationsStore.put("inventory_handoffs", inventoryHandoff);

    await runtime.emit("dt.operations_process.completed", {
      operationsSnapshot: snapshot,
      inventoryHandoffId: inventoryHandoff.inventoryHandoffId
    });

    return runtime.success({ operationsSnapshot: snapshot, inventoryHandoff });
  }

  const api = Object.freeze({
    buildOperationsProcessState,
    getOperationsSnapshot: ({ operationsSnapshotId }) =>
      global.INFINICUS.DT.operationsStore.get("snapshots", operationsSnapshotId),
    getInventoryHandoff: ({ inventoryHandoffId }) =>
      global.INFINICUS.DT.operationsStore.get("inventory_handoffs", inventoryHandoffId),
    listTwinProcesses: ({ twinId }) =>
      global.INFINICUS.DT.operationsStore.listByTwin("processes", twinId),
    listTwinStages: ({ twinId }) =>
      global.INFINICUS.DT.operationsStore.listByTwin("stages", twinId),
    listTwinWorkItems: ({ twinId }) =>
      global.INFINICUS.DT.operationsStore.listByTwin("work_items", twinId)
  });

  runtime.registerService("dt.operations_process_twin", api, { block: "DT-11" });
  runtime.registerRoute("dt.operations_process.build", buildOperationsProcessState);
  global.INFINICUS.DT.operationsProcessTwinEngine = api;
})(window);
