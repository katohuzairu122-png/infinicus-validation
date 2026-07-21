(function (global) {
  "use strict";

  function createProduct(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;
    if (!input.twinId || !input.sku || !input.name) {
      return runtime.failure("PRODUCT_INVALID", "twinId, sku, and name are required.");
    }
    return runtime.success({
      productId: input.productId || runtime.createId("dt_product"),
      twinId: String(input.twinId),
      sku: String(input.sku).trim().toUpperCase(),
      name: String(input.name),
      category: String(input.category || ""),
      unit: String(input.unit || "unit"),
      unitCost: Number(input.unitCost || 0),
      sellingPrice: Number(input.sellingPrice || 0),
      reorderPoint: Number(input.reorderPoint || 0),
      reorderQuantity: Number(input.reorderQuantity || 0),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  function createLocation(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;
    if (!input.twinId || !input.name || !input.locationType) {
      return runtime.failure("INVENTORY_LOCATION_INVALID", "twinId, name, and locationType are required.");
    }
    return runtime.success({
      inventoryLocationId: input.inventoryLocationId || runtime.createId("dt_inventory_location"),
      twinId: String(input.twinId),
      name: String(input.name),
      locationType: String(input.locationType),
      parentLocationId: input.parentLocationId || null,
      capacity: Number(input.capacity || 0),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.DT.productLocationModel = Object.freeze({ createProduct, createLocation });
})(window);
