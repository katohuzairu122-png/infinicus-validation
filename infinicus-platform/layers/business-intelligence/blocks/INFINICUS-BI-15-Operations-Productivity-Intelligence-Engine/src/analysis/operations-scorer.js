(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function score(profile = {}) {
    const utilization =
      profile.capacityUtilizationPercent == null
        ? 50
        : clamp(100 - Math.abs(profile.capacityUtilizationPercent - 80) * 2);

    const productivity =
      profile.productivityGrowthPercent == null
        ? 50
        : clamp(50 + profile.productivityGrowthPercent * 2);

    const cycleTime =
      profile.cycleTimeVariancePercent == null
        ? 50
        : clamp(100 - Math.abs(profile.cycleTimeVariancePercent) * 2);

    const service =
      profile.slaCompliancePercent == null
        ? 50
        : clamp(profile.slaCompliancePercent);

    const quality =
      profile.defectRatePercent == null
        ? 50
        : clamp(100 - profile.defectRatePercent * 5);

    const total =
      utilization * 0.2 +
      productivity * 0.25 +
      cycleTime * 0.2 +
      service * 0.2 +
      quality * 0.15;

    return {
      score: Number(total.toFixed(2)),
      level:
        total >= 85 ? "strong" :
        total >= 70 ? "healthy" :
        total >= 50 ? "vulnerable" :
        "critical",
      components: {
        utilization,
        productivity,
        cycleTime,
        service,
        quality
      }
    };
  }

  global.INFINICUS.BI.operationsHealthScorer =
    Object.freeze({ score });
})(window);
