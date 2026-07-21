(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;
    if (!input.twinId || !input.productId || !input.inventoryLocationId || !input.period) {
      return runtime.failure("INVENTORY_STATE_INVALID", "twinId, productId, inventoryLocationId, and period are required.");
    }

    const onHand = Number(input.onHand || 0);
    const committed = Number(input.committed || 0);
    const inbound = Number(input.inbound || 0);
    const available = input.available == null ? onHand - committed : Number(input.available);

    return runtime.success({
      inventoryStateId: input.inventoryStateId || runtime.createId("dt_inventory_state"),
      twinId: String(input.twinId),
      productId: String(input.productId),
      inventoryLocationId: String(input.inventoryLocationId),
      period: String(input.period),
      onHand,
      committed,
      available,
      inbound,
      demandPerDay: Number(input.demandPerDay || 0),
      stockoutUnits: Number(input.stockoutUnits || 0),
      wasteUnits: Number(input.wasteUnits || 0),
      shrinkageUnits: Number(input.shrinkageUnits || 0),
      obsoleteUnits: Number(input.obsoleteUnits || 0),
      sourceType: String(input.sourceType || "observed"),
      lineage: runtime.clone(input.lineage || []),
      confidence: Number(input.confidence ?? 1),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.DT.inventoryStateModel = Object.freeze({ create });
})(window);
