(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function score(profile = {}) {
    const availability =
      profile.stockAvailabilityPercent == null
        ? 50
        : clamp(profile.stockAvailabilityPercent);

    const turnover =
      profile.inventoryTurnover == null
        ? 50
        : clamp(profile.inventoryTurnover / 12 * 100);

    const stockouts =
      profile.stockoutRatePercent == null
        ? 50
        : clamp(100 - profile.stockoutRatePercent * 5);

    const supplierReliability =
      profile.supplierOnTimeDeliveryPercent == null
        ? 50
        : clamp(profile.supplierOnTimeDeliveryPercent);

    const waste =
      profile.wasteRatePercent == null
        ? 50
        : clamp(100 - profile.wasteRatePercent * 5);

    const total =
      availability * 0.25 +
      turnover * 0.2 +
      stockouts * 0.2 +
      supplierReliability * 0.2 +
      waste * 0.15;

    return {
      score: Number(total.toFixed(2)),
      level:
        total >= 85 ? "strong" :
        total >= 70 ? "healthy" :
        total >= 50 ? "vulnerable" :
        "critical",
      components: {
        availability,
        turnover,
        stockouts,
        supplierReliability,
        waste
      }
    };
  }

  global.INFINICUS.BI.inventoryHealthScorer =
    Object.freeze({ score });
})(window);
