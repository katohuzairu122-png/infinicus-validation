(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function score(profile = {}) {
    const marketGrowth =
      profile.marketGrowthPercent == null
        ? 50
        : clamp(50 + profile.marketGrowthPercent * 2);

    const marketShare =
      profile.marketSharePercent == null
        ? 50
        : clamp(profile.marketSharePercent * 4);

    const demand =
      profile.demandGrowthPercent == null
        ? 50
        : clamp(50 + profile.demandGrowthPercent * 2);

    const pricing =
      profile.priceCompetitivenessScore == null
        ? 50
        : clamp(profile.priceCompetitivenessScore);

    const differentiation =
      profile.differentiationScore == null
        ? 50
        : clamp(profile.differentiationScore);

    const total =
      marketGrowth * 0.25 +
      marketShare * 0.2 +
      demand * 0.2 +
      pricing * 0.15 +
      differentiation * 0.2;

    return {
      score: Number(total.toFixed(2)),
      level:
        total >= 85 ? "strong" :
        total >= 70 ? "favorable" :
        total >= 50 ? "competitive" :
        "adverse",
      components: {
        marketGrowth,
        marketShare,
        demand,
        pricing,
        differentiation
      }
    };
  }

  global.INFINICUS.BI.marketHealthScorer =
    Object.freeze({ score });
})(window);
