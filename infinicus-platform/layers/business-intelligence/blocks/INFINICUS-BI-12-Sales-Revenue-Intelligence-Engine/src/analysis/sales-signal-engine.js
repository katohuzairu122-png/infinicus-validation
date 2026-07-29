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
      profile.revenueGrowthPercent != null &&
      profile.revenueGrowthPercent < 0
    ) {
      add("REVENUE_DECLINE", "critical", "Revenue growth is negative.", "revenueGrowthPercent");
    }

    if (
      profile.conversionRatePercent != null &&
      profile.conversionRatePercent < 10
    ) {
      add("LOW_CONVERSION", "warning", "Sales conversion rate is below 10%.", "conversionRatePercent");
    }

    if (
      profile.pipelineCoverage != null &&
      profile.pipelineCoverage < 2
    ) {
      add("WEAK_PIPELINE", "warning", "Pipeline coverage is below 2× target.", "pipelineCoverage");
    }

    if (
      profile.topCustomerRevenueSharePercent != null &&
      profile.topCustomerRevenueSharePercent > 40
    ) {
      add("REVENUE_CONCENTRATION", "warning", "More than 40% of revenue depends on one customer.", "topCustomerRevenueSharePercent");
    }

    if (
      profile.winRatePercent != null &&
      profile.winRatePercent > 50
    ) {
      add("STRONG_WIN_RATE", "opportunity", "Win rate is above 50%.", "winRatePercent");
    }

    if (
      profile.averageOrderValueGrowthPercent != null &&
      profile.averageOrderValueGrowthPercent > 10
    ) {
      add("ORDER_VALUE_GROWTH", "opportunity", "Average order value is growing strongly.", "averageOrderValueGrowthPercent");
    }

    return signals;
  }

  global.INFINICUS.BI.salesSignalEngine =
    Object.freeze({ generate });
})(window);
