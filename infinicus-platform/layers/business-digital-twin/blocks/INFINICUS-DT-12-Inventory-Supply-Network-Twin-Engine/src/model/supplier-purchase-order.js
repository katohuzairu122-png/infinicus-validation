(function (global) {
  "use strict";

  function createSupplier(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;
    if (!input.twinId || !input.name || !input.supplierKey) {
      return runtime.failure("SUPPLIER_INVALID", "twinId, name, and supplierKey are required.");
    }
    return runtime.success({
      supplierId: input.supplierId || runtime.createId("dt_supplier"),
      twinId: String(input.twinId),
      supplierKey: String(input.supplierKey),
      name: String(input.name),
      leadTimeDays: Number(input.leadTimeDays || 0),
      onTimeDeliveryPercent: Number(input.onTimeDeliveryPercent ?? 100),
      qualityScore: Number(input.qualityScore ?? 100),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  function createPurchaseOrder(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;
    if (!input.twinId || !input.purchaseOrderKey || !input.supplierId) {
      return runtime.failure("PURCHASE_ORDER_INVALID", "twinId, purchaseOrderKey, and supplierId are required.");
    }
    return runtime.success({
      purchaseOrderId: input.purchaseOrderId || runtime.createId("dt_purchase_order"),
      twinId: String(input.twinId),
      purchaseOrderKey: String(input.purchaseOrderKey),
      supplierId: String(input.supplierId),
      inventoryLocationId: input.inventoryLocationId || null,
      orderedAt: input.orderedAt || new Date().toISOString(),
      expectedAt: input.expectedAt || null,
      receivedAt: input.receivedAt || null,
      lines: runtime.clone(input.lines || []),
      status: String(input.status || "open"),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.DT.supplierPurchaseOrderModel = Object.freeze({
    createSupplier,
    createPurchaseOrder
  });
})(window);
