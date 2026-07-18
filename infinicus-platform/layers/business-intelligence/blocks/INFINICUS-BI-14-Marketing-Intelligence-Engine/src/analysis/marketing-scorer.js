(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function score(profile = {}) {
    const conversion =
      profile.marketingConversionRatePercent == null
        ? 50
        : clamp(profile.marketingConversionRatePercent * 4);

    const roas =
      profile.returnOnAdSpend == null
        ? 50
        : clamp(profile.returnOnAdSpend / 4 * 100);

    const roi =
      profile.marketingRoiPercent == null
        ? 50
        : clamp(50 + profile.marketingRoiPercent / 2);

    const acquisitionEfficiency =
      profile.customerAcquisitionCostTrendPercent == null
        ? 50
        : clamp(70 - profile.customerAcquisitionCostTrendPercent * 2);

    const engagement =
      profile.engagementRatePercent == null
        ? 50
        : clamp(profile.engagementRatePercent * 5);

    const total =
      conversion * 0.2 +
      roas * 0.25 +
      roi * 0.2 +
      acquisitionEfficiency * 0.2 +
      engagement * 0.15;

    return {
      score: Number(total.toFixed(2)),
      level:
        total >= 85 ? "strong" :
        total >= 70 ? "healthy" :
        total >= 50 ? "vulnerable" :
        "critical",
      components: {
        conversion,
        roas,
        roi,
        acquisitionEfficiency,
        engagement
      }
    };
  }

  global.INFINICUS.BI.marketingHealthScorer =
    Object.freeze({ score });
})(window);
