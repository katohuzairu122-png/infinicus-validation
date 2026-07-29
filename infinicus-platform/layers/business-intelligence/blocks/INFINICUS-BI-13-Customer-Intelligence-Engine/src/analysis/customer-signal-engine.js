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
      profile.churnRatePercent != null &&
      profile.churnRatePercent > 10
    ) {
      add("HIGH_CHURN", "critical", "Customer churn exceeds 10%.", "churnRatePercent");
    }

    if (
      profile.retentionRatePercent != null &&
      profile.retentionRatePercent < 70
    ) {
      add("LOW_RETENTION", "warning", "Customer retention is below 70%.", "retentionRatePercent");
    }

    if (
      profile.activationRatePercent != null &&
      profile.activationRatePercent < 50
    ) {
      add("LOW_ACTIVATION", "warning", "Less than half of acquired customers activate.", "activationRatePercent");
    }

    if (
      profile.netPromoterScore != null &&
      profile.netPromoterScore < 0
    ) {
      add("NEGATIVE_ADVOCACY", "warning", "Net Promoter Score is negative.", "netPromoterScore");
    }

    if (
      profile.customerLifetimeValueGrowthPercent != null &&
      profile.customerLifetimeValueGrowthPercent > 10
    ) {
      add("LTV_GROWTH", "opportunity", "Customer lifetime value is growing strongly.", "customerLifetimeValueGrowthPercent");
    }

    if (
      profile.repeatPurchaseRatePercent != null &&
      profile.repeatPurchaseRatePercent > 50
    ) {
      add("STRONG_REPEAT_PURCHASE", "opportunity", "Repeat purchase rate exceeds 50%.", "repeatPurchaseRatePercent");
    }

    return signals;
  }

  global.INFINICUS.BI.customerSignalEngine =
    Object.freeze({ generate });
})(window);
