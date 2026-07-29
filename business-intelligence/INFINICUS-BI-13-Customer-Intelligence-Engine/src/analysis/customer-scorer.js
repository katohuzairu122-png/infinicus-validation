(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function score(profile = {}) {
    const retention =
      profile.retentionRatePercent == null
        ? 50
        : clamp(profile.retentionRatePercent);

    const churn =
      profile.churnRatePercent == null
        ? 50
        : clamp(100 - profile.churnRatePercent * 2);

    const activation =
      profile.activationRatePercent == null
        ? 50
        : clamp(profile.activationRatePercent);

    const satisfaction =
      profile.customerSatisfactionScore == null
        ? 50
        : clamp(profile.customerSatisfactionScore * 20);

    const advocacy =
      profile.netPromoterScore == null
        ? 50
        : clamp((profile.netPromoterScore + 100) / 2);

    const total =
      retention * 0.3 +
      churn * 0.25 +
      activation * 0.15 +
      satisfaction * 0.15 +
      advocacy * 0.15;

    return {
      score: Number(total.toFixed(2)),
      level:
        total >= 85 ? "strong" :
        total >= 70 ? "healthy" :
        total >= 50 ? "vulnerable" :
        "critical",
      components: {
        retention,
        churn,
        activation,
        satisfaction,
        advocacy
      }
    };
  }

  global.INFINICUS.BI.customerHealthScorer =
    Object.freeze({ score });
})(window);
