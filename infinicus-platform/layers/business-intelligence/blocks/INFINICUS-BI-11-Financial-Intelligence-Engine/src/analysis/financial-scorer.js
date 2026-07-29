(function (global) {
  "use strict";

  function clamp(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function score(input = {}) {
    const profitability =
      input.netProfitMargin == null
        ? 50
        : clamp(50 + input.netProfitMargin * 2);

    const liquidity =
      input.currentRatio == null
        ? 50
        : clamp(input.currentRatio * 40);

    const runway =
      input.runwayMonths == null
        ? 50
        : clamp(input.runwayMonths / 12 * 100);

    const cashFlow =
      input.operatingCashFlow == null
        ? 50
        : input.operatingCashFlow >= 0 ? 80 : 20;

    const budgetControl =
      input.budgetVariancePercent == null
        ? 50
        : clamp(100 - Math.abs(input.budgetVariancePercent) * 2);

    const total =
      profitability * 0.3 +
      liquidity * 0.2 +
      runway * 0.2 +
      cashFlow * 0.2 +
      budgetControl * 0.1;

    return {
      score: Number(total.toFixed(2)),
      level:
        total >= 85 ? "strong" :
        total >= 70 ? "stable" :
        total >= 50 ? "vulnerable" :
        "critical",
      components: {
        profitability,
        liquidity,
        runway,
        cashFlow,
        budgetControl
      }
    };
  }

  global.INFINICUS.BI.financialHealthScorer =
    Object.freeze({ score });
})(window);
