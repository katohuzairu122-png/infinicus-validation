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
      profile.marketGrowthPercent != null &&
      profile.marketGrowthPercent < 0
    ) {
      add("MARKET_CONTRACTION", "critical", "The market is contracting.", "marketGrowthPercent");
    }

    if (
      profile.marketShareTrendPercent != null &&
      profile.marketShareTrendPercent < -5
    ) {
      add("MARKET_SHARE_LOSS", "critical", "Market share declined by more than 5%.", "marketShareTrendPercent");
    }

    if (
      profile.competitorPriceGapPercent != null &&
      profile.competitorPriceGapPercent > 15
    ) {
      add("PRICE_DISADVANTAGE", "warning", "Pricing is more than 15% above competitor benchmark.", "competitorPriceGapPercent");
    }

    if (
      profile.competitiveIntensityScore != null &&
      profile.competitiveIntensityScore > 80
    ) {
      add("HIGH_COMPETITIVE_PRESSURE", "warning", "Competitive intensity is very high.", "competitiveIntensityScore");
    }

    if (
      profile.demandGrowthPercent != null &&
      profile.demandGrowthPercent > 10
    ) {
      add("DEMAND_GROWTH", "opportunity", "Demand is growing by more than 10%.", "demandGrowthPercent");
    }

    if (
      profile.differentiationScore != null &&
      profile.differentiationScore >= 80
    ) {
      add("STRONG_DIFFERENTIATION", "opportunity", "Differentiation score is at least 80.", "differentiationScore");
    }

    return signals;
  }

  global.INFINICUS.BI.marketSignalEngine =
    Object.freeze({ generate });
})(window);
