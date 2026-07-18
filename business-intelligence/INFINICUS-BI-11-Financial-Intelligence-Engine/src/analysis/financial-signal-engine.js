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

    if (profile.netProfitMargin != null && profile.netProfitMargin < 0) {
      add("NEGATIVE_MARGIN", "critical", "Net profit margin is negative.", "netProfitMargin");
    }

    if (profile.grossMargin != null && profile.grossMargin < 20) {
      add("LOW_GROSS_MARGIN", "warning", "Gross margin is below 20%.", "grossMargin");
    }

    if (profile.currentRatio != null && profile.currentRatio < 1) {
      add("LIQUIDITY_PRESSURE", "critical", "Current liabilities exceed current assets.", "currentRatio");
    }

    if (profile.runwayMonths != null && profile.runwayMonths < 3) {
      add("SHORT_RUNWAY", "critical", "Cash runway is below three months.", "runwayMonths");
    }

    if (profile.operatingCashFlow != null && profile.operatingCashFlow < 0) {
      add("NEGATIVE_OPERATING_CASH_FLOW", "warning", "Operating cash flow is negative.", "operatingCashFlow");
    }

    if (
      profile.budgetVariancePercent != null &&
      Math.abs(profile.budgetVariancePercent) > 10
    ) {
      add("BUDGET_VARIANCE", "warning", "Budget variance exceeds 10%.", "budgetVariancePercent");
    }

    return signals;
  }

  global.INFINICUS.BI.financialSignalEngine =
    Object.freeze({ generate });
})(window);
