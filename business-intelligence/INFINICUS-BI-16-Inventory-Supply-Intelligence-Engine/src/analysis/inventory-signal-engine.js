(function (global) {
  "use strict";

  function generate(profile = {}) {
    const signals = [];

    function add(code, severity, message, metric) {
      signals.push({
        code,
        severity,
        message,
        metric,
        detectedAt: new Date().toISOString()
      });
    }

    if (
      profile.stockoutRatePercent != null &&
      profile.stockoutRatePercent > 5
    ) {
      add("HIGH_STOCKOUT_RATE", "critical", "Stockout rate exceeds 5%.", "stockoutRatePercent");
    }

    if (
      profile.inventoryDaysOnHand != null &&
      profile.inventoryDaysOnHand > 90
    ) {
      add("EXCESS_INVENTORY", "warning", "Inventory days on hand exceeds 90 days.", "inventoryDaysOnHand");
    }

    if (
      profile.wasteRatePercent != null &&
      profile.wasteRatePercent > 5
    ) {
      add("HIGH_WASTE", "warning", "Waste rate exceeds 5%.", "wasteRatePercent");
    }

    if (
      profile.supplierOnTimeDeliveryPercent != null &&
      profile.supplierOnTimeDeliveryPercent < 90
    ) {
      add("SUPPLIER_DELIVERY_RISK", "warning", "Supplier on-time delivery is below 90%.", "supplierOnTimeDeliveryPercent");
    }

    if (
      profile.inventoryTurnoverGrowthPercent != null &&
      profile.inventoryTurnoverGrowthPercent > 10
    ) {
      add("TURNOVER_IMPROVEMENT", "opportunity", "Inventory turnover is improving strongly.", "inventoryTurnoverGrowthPercent");
    }

    if (
      profile.stockAvailabilityPercent != null &&
      profile.stockAvailabilityPercent >= 98
    ) {
      add("HIGH_AVAILABILITY", "opportunity", "Stock availability is at least 98%.", "stockAvailabilityPercent");
    }

    return signals;
  }

  global.INFINICUS.BI.inventorySignalEngine =
    Object.freeze({ generate });
})(window);
