(function (global) {
  "use strict";

  function analyze({ products = [], states = [], suppliers = [], purchaseOrders = [] } = {}) {
    const productById = new Map(products.map(item => [item.productId, item]));

    const totalOnHand = states.reduce((s,x)=>s+Number(x.onHand||0),0);
    const totalAvailable = states.reduce((s,x)=>s+Number(x.available||0),0);
    const totalDemandPerDay = states.reduce((s,x)=>s+Number(x.demandPerDay||0),0);
    const totalStockout = states.reduce((s,x)=>s+Number(x.stockoutUnits||0),0);
    const totalWaste = states.reduce((s,x)=>s+Number(x.wasteUnits||0),0);
    const totalShrinkage = states.reduce((s,x)=>s+Number(x.shrinkageUnits||0),0);
    const totalObsolete = states.reduce((s,x)=>s+Number(x.obsoleteUnits||0),0);

    const inventoryValue = states.reduce((sum, state) =>
      sum + Number(state.onHand || 0) * Number(productById.get(state.productId)?.unitCost || 0), 0);

    const daysOnHand = totalDemandPerDay === 0
      ? null
      : Number((totalOnHand / totalDemandPerDay).toFixed(4));

    const stockAvailabilityPercent = totalOnHand === 0
      ? null
      : Number((totalAvailable / totalOnHand * 100).toFixed(4));

    const stockoutRatePercent = totalDemandPerDay === 0
      ? null
      : Number((totalStockout / totalDemandPerDay * 100).toFixed(4));

    const supplierOnTimeDeliveryPercent = suppliers.length === 0
      ? null
      : Number((suppliers.reduce((s,x)=>s+Number(x.onTimeDeliveryPercent||0),0)/suppliers.length).toFixed(4));

    const averageSupplierLeadTimeDays = suppliers.length === 0
      ? null
      : Number((suppliers.reduce((s,x)=>s+Number(x.leadTimeDays||0),0)/suppliers.length).toFixed(4));

    const openPurchaseOrderCount = purchaseOrders.filter(po => po.status === "open").length;

    const reorderCandidates = states
      .filter(state => {
        const product = productById.get(state.productId);
        return product && Number(state.available) <= Number(product.reorderPoint || 0);
      })
      .map(state => ({
        productId: state.productId,
        inventoryLocationId: state.inventoryLocationId,
        available: state.available,
        reorderPoint: productById.get(state.productId).reorderPoint,
        reorderQuantity: productById.get(state.productId).reorderQuantity
      }));

    return {
      inventoryValue: Number(inventoryValue.toFixed(4)),
      totalOnHand: Number(totalOnHand.toFixed(4)),
      totalAvailable: Number(totalAvailable.toFixed(4)),
      daysOnHand,
      stockAvailabilityPercent,
      stockoutRatePercent,
      totalWaste: Number(totalWaste.toFixed(4)),
      totalShrinkage: Number(totalShrinkage.toFixed(4)),
      totalObsolete: Number(totalObsolete.toFixed(4)),
      supplierOnTimeDeliveryPercent,
      averageSupplierLeadTimeDays,
      openPurchaseOrderCount,
      reorderCandidates
    };
  }

  global.INFINICUS.DT.inventorySupplyAnalyzer = Object.freeze({ analyze });
})(window);
