(function (global) {
  "use strict";

  function analyze({
    markets = [],
    segments = [],
    competitors = [],
    states = [],
    externalForces = []
  } = {}) {
    const avg = values => {
      const clean =
        values
          .map(Number)
          .filter(Number.isFinite);

      return clean.length
        ? Number(
            (
              clean.reduce(
                (a, b) => a + b,
                0
              ) / clean.length
            ).toFixed(4)
          )
        : null;
    };

    const totalAddressableMarket =
      markets.reduce(
        (sum, item) =>
          sum +
          Number(
            item.totalAddressableMarket || 0
          ),
        0
      );

    const serviceableAvailableMarket =
      markets.reduce(
        (sum, item) =>
          sum +
          Number(
            item.serviceableAvailableMarket || 0
          ),
        0
      );

    const serviceableObtainableMarket =
      markets.reduce(
        (sum, item) =>
          sum +
          Number(
            item.serviceableObtainableMarket || 0
          ),
        0
      );

    const competitorRanking =
      competitors
        .map(competitor => ({
          competitorId:
            competitor.competitorId,
          name:
            competitor.name,
          threatScore:
            competitor.threatScore,
          marketSharePercent:
            competitor.marketSharePercent,
          averagePriceIndex:
            competitor.averagePriceIndex,
          differentiationScore:
            competitor.differentiationScore
        }))
        .sort((a, b) =>
          Number(b.threatScore || 0) -
          Number(a.threatScore || 0)
        );

    const weightedExternalRisk =
      externalForces.reduce(
        (sum, force) =>
          sum +
          Number(force.impactScore || 0) *
          Number(force.probability || 0),
        0
      );

    return {
      marketCount:
        markets.length,
      segmentCount:
        segments.length,
      competitorCount:
        competitors.length,
      totalAddressableMarket:
        Number(totalAddressableMarket.toFixed(4)),
      serviceableAvailableMarket:
        Number(serviceableAvailableMarket.toFixed(4)),
      serviceableObtainableMarket:
        Number(serviceableObtainableMarket.toFixed(4)),
      averageMarketGrowthRatePercent:
        avg(
          markets.map(
            item =>
              item.growthRatePercent
          )
        ),
      averageOwnMarketSharePercent:
        avg(
          states.map(
            item =>
              item.ownMarketSharePercent
          )
        ),
      averageDemandIndex:
        avg(
          states.map(
            item =>
              item.demandIndex
          )
        ),
      averageCompetitiveIntensityScore:
        avg(
          states.map(
            item =>
              item.competitiveIntensityScore
          )
        ),
      averageDifferentiationScore:
        avg(
          states.map(
            item =>
              item.differentiationScore
          )
        ),
      weightedExternalRisk:
        Number(
          weightedExternalRisk.toFixed(4)
        ),
      competitorRanking
    };
  }

  global.INFINICUS.DT.marketAnalyzer =
    Object.freeze({ analyze });
})(window);
