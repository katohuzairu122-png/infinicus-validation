(function (global) {
  "use strict";
  const runtime = global.INFINICUS.DT.runtime;

  async function buildInventorySupplyState({
    inventoryHandoffId,
    productInputs = [],
    locationInputs = [],
    supplierInputs = [],
    purchaseOrderInputs = [],
    stateInputs = []
  } = {}) {
    const handoff = await global.INFINICUS.DT
      .operationsProcessTwinEngine
      .getInventoryHandoff({ inventoryHandoffId });

    if (!handoff.ok) return handoff;

    const products = [];
    for (const input of productInputs) {
      const built = global.INFINICUS.DT.productLocationModel.createProduct({
        ...input,
        twinId: handoff.data.twinId
      });
      if (!built.ok) return built;
      products.push(built.data);
      await global.INFINICUS.DT.inventorySupplyStore.put("products", built.data);
    }

    const locations = [];
    for (const input of locationInputs) {
      const built = global.INFINICUS.DT.productLocationModel.createLocation({
        ...input,
        twinId: handoff.data.twinId
      });
      if (!built.ok) return built;
      locations.push(built.data);
      await global.INFINICUS.DT.inventorySupplyStore.put("locations", built.data);
    }

    const suppliers = [];
    for (const input of supplierInputs) {
      const built = global.INFINICUS.DT.supplierPurchaseOrderModel.createSupplier({
        ...input,
        twinId: handoff.data.twinId
      });
      if (!built.ok) return built;
      suppliers.push(built.data);
      await global.INFINICUS.DT.inventorySupplyStore.put("suppliers", built.data);
    }

    const purchaseOrders = [];
    for (const input of purchaseOrderInputs) {
      const built = global.INFINICUS.DT.supplierPurchaseOrderModel.createPurchaseOrder({
        ...input,
        twinId: handoff.data.twinId
      });
      if (!built.ok) return built;
      purchaseOrders.push(built.data);
    }

    const states = [];
    for (const input of stateInputs) {
      const built = global.INFINICUS.DT.inventoryStateModel.create({
        ...input,
        twinId: handoff.data.twinId
      });
      if (!built.ok) return built;
      states.push(built.data);
    }

    const validation = global.INFINICUS.DT.inventorySupplyValidator.validate({
      products, locations, suppliers, purchaseOrders, states
    });

    if (!validation.valid) {
      return runtime.failure(
        "INVENTORY_SUPPLY_STATE_INVALID",
        "Inventory and supply validation failed.",
        validation
      );
    }

    for (const po of purchaseOrders) {
      await global.INFINICUS.DT.inventorySupplyStore.put("purchase_orders", po);
    }
    for (const state of states) {
      await global.INFINICUS.DT.inventorySupplyStore.put("states", state);
    }

    const analysis = global.INFINICUS.DT.inventorySupplyAnalyzer.analyze({
      products, states, suppliers, purchaseOrders
    });

    const snapshot = {
      inventorySupplySnapshotId: runtime.createId("dt_inventory_supply_snapshot"),
      inventoryHandoffId,
      businessId: handoff.data.businessId,
      twinId: handoff.data.twinId,
      products: products.map(runtime.clone),
      locations: locations.map(runtime.clone),
      suppliers: suppliers.map(runtime.clone),
      purchaseOrders: purchaseOrders.map(runtime.clone),
      states: states.map(runtime.clone),
      analysis: runtime.clone(analysis),
      operationsAnalysis: runtime.clone(handoff.data.operationsAnalysis),
      status: "current",
      createdAt: new Date().toISOString()
    };

    await global.INFINICUS.DT.inventorySupplyStore.put("snapshots", snapshot);

    const workforceHandoff = {
      workforceHandoffId: runtime.createId("dt_workforce_handoff"),
      targetBlock: "DT-13",
      inventorySupplySnapshotId: snapshot.inventorySupplySnapshotId,
      operationsSnapshotId: handoff.data.operationsSnapshotId,
      marketingSnapshotId: handoff.data.marketingSnapshotId,
      salesRevenueSnapshotId: handoff.data.salesRevenueSnapshotId,
      customerDemandSnapshotId: handoff.data.customerDemandSnapshotId,
      financialSnapshotId: handoff.data.financialSnapshotId,
      businessId: snapshot.businessId,
      twinId: snapshot.twinId,
      inventoryAnalysis: runtime.clone(analysis),
      products: products.map(runtime.clone),
      locations: locations.map(runtime.clone),
      suppliers: suppliers.map(runtime.clone),
      purchaseOrders: purchaseOrders.map(runtime.clone),
      inventoryStates: states.map(runtime.clone),
      processes: handoff.data.processes.map(runtime.clone),
      stages: handoff.data.stages.map(runtime.clone),
      resources: handoff.data.resources.map(runtime.clone),
      workItems: handoff.data.workItems.map(runtime.clone),
      operationsAnalysis: runtime.clone(handoff.data.operationsAnalysis),
      customerProfiles: handoff.data.customerProfiles.map(runtime.clone),
      customerSegments: handoff.data.customerSegments.map(runtime.clone),
      financialProfile: runtime.clone(handoff.data.financialProfile),
      sourceContext: runtime.clone(handoff.data.sourceContext),
      correlationId: handoff.data.correlationId,
      status: "ready",
      createdAt: new Date().toISOString()
    };

    await global.INFINICUS.DT.inventorySupplyStore.put("workforce_handoffs", workforceHandoff);

    await runtime.emit("dt.inventory_supply.completed", {
      inventorySupplySnapshot: snapshot,
      workforceHandoffId: workforceHandoff.workforceHandoffId
    });

    return runtime.success({ inventorySupplySnapshot: snapshot, workforceHandoff });
  }

  const api = Object.freeze({
    buildInventorySupplyState,
    getInventorySupplySnapshot: ({ inventorySupplySnapshotId }) =>
      global.INFINICUS.DT.inventorySupplyStore.get("snapshots", inventorySupplySnapshotId),
    getWorkforceHandoff: ({ workforceHandoffId }) =>
      global.INFINICUS.DT.inventorySupplyStore.get("workforce_handoffs", workforceHandoffId),
    listTwinProducts: ({ twinId }) =>
      global.INFINICUS.DT.inventorySupplyStore.listByTwin("products", twinId),
    listTwinSuppliers: ({ twinId }) =>
      global.INFINICUS.DT.inventorySupplyStore.listByTwin("suppliers", twinId),
    listTwinInventoryStates: ({ twinId }) =>
      global.INFINICUS.DT.inventorySupplyStore.listByTwin("states", twinId)
  });

  runtime.registerService("dt.inventory_supply_twin", api, { block: "DT-12" });
  runtime.registerRoute("dt.inventory_supply.build", buildInventorySupplyState);
  global.INFINICUS.DT.inventorySupplyTwinEngine = api;
})(window);
