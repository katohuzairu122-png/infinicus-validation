(function (global) {
  "use strict";

  function validate({ products = [], locations = [], suppliers = [], purchaseOrders = [], states = [] } = {}) {
    const issues = [];
    const productIds = new Set(products.map(item => item.productId));
    const locationIds = new Set(locations.map(item => item.inventoryLocationId));
    const supplierIds = new Set(suppliers.map(item => item.supplierId));

    for (const state of states) {
      if (!productIds.has(state.productId)) issues.push(`Unknown product: ${state.productId}`);
      if (!locationIds.has(state.inventoryLocationId)) issues.push(`Unknown location: ${state.inventoryLocationId}`);
      if (state.confidence < 0 || state.confidence > 1) issues.push("Inventory-state confidence must be between 0 and 1.");
    }

    for (const po of purchaseOrders) {
      if (!supplierIds.has(po.supplierId)) issues.push(`Unknown supplier: ${po.supplierId}`);
      if (po.inventoryLocationId && !locationIds.has(po.inventoryLocationId)) issues.push(`Unknown PO location: ${po.inventoryLocationId}`);
      for (const line of po.lines || []) {
        if (!productIds.has(line.productId)) issues.push(`Unknown PO product: ${line.productId}`);
      }
    }

    return { valid: issues.length === 0, issues };
  }

  global.INFINICUS.DT.inventorySupplyValidator = Object.freeze({ validate });
})(window);
