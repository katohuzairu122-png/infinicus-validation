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
      profile.returnOnAdSpend != null &&
      profile.returnOnAdSpend < 1
    ) {
      add("NEGATIVE_ROAS", "critical", "Advertising revenue is below advertising spend.", "returnOnAdSpend");
    }

    if (
      profile.marketingConversionRatePercent != null &&
      profile.marketingConversionRatePercent < 2
    ) {
      add("LOW_MARKETING_CONVERSION", "warning", "Marketing conversion rate is below 2%.", "marketingConversionRatePercent");
    }

    if (
      profile.customerAcquisitionCostTrendPercent != null &&
      profile.customerAcquisitionCostTrendPercent > 10
    ) {
      add("CAC_INCREASING", "warning", "Customer acquisition cost is increasing by more than 10%.", "customerAcquisitionCostTrendPercent");
    }

    if (
      profile.engagementRatePercent != null &&
      profile.engagementRatePercent < 2
    ) {
      add("LOW_ENGAGEMENT", "warning", "Audience engagement is below 2%.", "engagementRatePercent");
    }

    if (
      profile.returnOnAdSpend != null &&
      profile.returnOnAdSpend >= 4
    ) {
      add("STRONG_ROAS", "opportunity", "Return on ad spend is at least 4×.", "returnOnAdSpend");
    }

    if (
      profile.organicTrafficGrowthPercent != null &&
      profile.organicTrafficGrowthPercent > 15
    ) {
      add("ORGANIC_GROWTH", "opportunity", "Organic traffic is growing strongly.", "organicTrafficGrowthPercent");
    }

    return signals;
  }

  global.INFINICUS.BI.marketingSignalEngine =
    Object.freeze({ generate });
})(window);
