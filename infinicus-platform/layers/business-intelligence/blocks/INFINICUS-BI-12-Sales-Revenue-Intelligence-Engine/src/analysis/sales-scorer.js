(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function score(profile = {}) {
    const growth =
      profile.revenueGrowthPercent == null
        ? 50
        : clamp(50 + profile.revenueGrowthPercent * 2);

    const conversion =
      profile.conversionRatePercent == null
        ? 50
        : clamp(profile.conversionRatePercent * 4);

    const winRate =
      profile.winRatePercent == null
        ? 50
        : clamp(profile.winRatePercent * 2);

    const pipeline =
      profile.pipelineCoverage == null
        ? 50
        : clamp(profile.pipelineCoverage / 3 * 100);

    const concentration =
      profile.topCustomerRevenueSharePercent == null
        ? 70
        : clamp(100 - profile.topCustomerRevenueSharePercent);

    const total =
      growth * 0.3 +
      conversion * 0.2 +
      winRate * 0.2 +
      pipeline * 0.2 +
      concentration * 0.1;

    return {
      score: Number(total.toFixed(2)),
      level:
        total >= 85 ? "strong" :
        total >= 70 ? "healthy" :
        total >= 50 ? "vulnerable" :
        "critical",
      components: {
        growth,
        conversion,
        winRate,
        pipeline,
        concentration
      }
    };
  }

  global.INFINICUS.BI.salesHealthScorer =
    Object.freeze({ score });
})(window);
