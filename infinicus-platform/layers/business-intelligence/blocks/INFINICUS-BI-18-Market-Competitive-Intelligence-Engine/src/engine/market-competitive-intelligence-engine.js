(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  function latestByCode(results = []) {
    const map = new Map();

    for (const result of results) {
      if (result.groupKey !== "__all__") continue;

      const existing = map.get(result.metricCode);

      if (!existing || new Date(result.calculatedAt) > new Date(existing.calculatedAt)) {
        map.set(result.metricCode, result);
      }
    }

    return map;
  }

  function read(map, candidates = []) {
    for (const code of candidates) {
      if (map.has(code)) {
        return Number(map.get(code).value);
      }
    }

    return null;
  }

  async function analyze({ intelligenceHandoffId } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .metricCalculationEngine
        .getIntelligenceHandoff({ intelligenceHandoffId });

    if (!handoff.ok) return handoff;

    const results = handoff.data.metricResults;
    const byCode = latestByCode(results);

    const profile = {
      totalAddressableMarket:
        read(byCode, ["total_addressable_market", "tam"]),
      serviceableAvailableMarket:
        read(byCode, ["serviceable_available_market", "sam"]),
      serviceableObtainableMarket:
        read(byCode, ["serviceable_obtainable_market", "som"]),
      marketGrowthPercent:
        read(byCode, ["market_growth_percent"]),
      demandGrowthPercent:
        read(byCode, ["demand_growth_percent"]),
      marketSharePercent:
        read(byCode, ["market_share_percent"]),
      marketShareTrendPercent:
        read(byCode, ["market_share_trend_percent"]),
      competitorPriceGapPercent:
        read(byCode, ["competitor_price_gap_percent"]),
      priceCompetitivenessScore:
        read(byCode, ["price_competitiveness_score"]),
      competitiveIntensityScore:
        read(byCode, ["competitive_intensity_score"]),
      differentiationScore:
        read(byCode, ["differentiation_score"]),
      categoryGrowthPercent:
        read(byCode, ["category_growth_percent"])
    };

    const health =
      global.INFINICUS.BI
        .marketHealthScorer
        .score(profile);

    const detected =
      global.INFINICUS.BI
        .marketSignalEngine
        .generate(profile);

    const marketRanking =
      global.INFINICUS.BI
        .marketRanker
        .rank(results, [
          "market_growth_by_market",
          "demand_growth_by_market",
          "market_attractiveness_by_market"
        ]);

    const segmentRanking =
      global.INFINICUS.BI
        .marketRanker
        .rank(results, [
          "segment_growth_rate",
          "segment_profitability_score",
          "segment_demand_score"
        ]);

    const competitorRanking =
      global.INFINICUS.BI
        .marketRanker
        .rank(results, [
          "competitor_market_share",
          "competitor_growth_rate",
          "competitor_brand_strength"
        ]);

    const marketAnalysis = {
      marketAnalysisId:
        runtime.createId("bi_market_analysis"),
      intelligenceHandoffId,
      calculationRunId:
        handoff.data.calculationRunId,
      warehouseSnapshotId:
        handoff.data.warehouseSnapshotId,
      correlationId:
        handoff.data.correlationId,
      profile:
        runtime.clone(profile),
      health:
        runtime.clone(health),
      marketRanking:
        marketRanking.map(runtime.clone),
      segmentRanking:
        segmentRanking.map(runtime.clone),
      competitorRanking:
        competitorRanking.map(runtime.clone),
      summary: {
        marketGrowth:
          profile.marketGrowthPercent != null
            ? `${profile.marketGrowthPercent}%`
            : "insufficient data",
        demandGrowth:
          profile.demandGrowthPercent != null
            ? `${profile.demandGrowthPercent}%`
            : "insufficient data",
        marketShare:
          profile.marketSharePercent != null
            ? `${profile.marketSharePercent}%`
            : "insufficient data",
        differentiation:
          profile.differentiationScore
      },
      sourceMetricCodes:
        [...new Set(results.map(result => result.metricCode))],
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .marketStore
      .put("analyses", marketAnalysis);

    const signals = [];

    for (const signal of detected) {
      const record = {
        marketSignalId:
          runtime.createId("bi_market_signal"),
        marketAnalysisId:
          marketAnalysis.marketAnalysisId,
        ...runtime.clone(signal),
        status: "open"
      };

      signals.push(record);

      await global.INFINICUS.BI
        .marketStore
        .put("signals", record);
    }

    const analysisHandoff = {
      analysisHandoffId:
        runtime.createId("bi_analysis_handoff"),
      targetBlock: "BI-19",
      sourceBlock: "BI-18",
      marketAnalysisId:
        marketAnalysis.marketAnalysisId,
      calculationRunId:
        marketAnalysis.calculationRunId,
      correlationId:
        marketAnalysis.correlationId,
      marketHealth:
        runtime.clone(health),
      profile:
        runtime.clone(profile),
      marketRanking:
        marketRanking.map(runtime.clone),
      segmentRanking:
        segmentRanking.map(runtime.clone),
      competitorRanking:
        competitorRanking.map(runtime.clone),
      signals:
        signals.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .marketStore
      .put("analysis_handoffs", analysisHandoff);

    await runtime.emit(
      "bi.market_competitive_intelligence.completed",
      {
        marketAnalysis,
        analysisHandoffId:
          analysisHandoff.analysisHandoffId
      }
    );

    return runtime.success({
      marketAnalysis,
      signals,
      analysisHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysis: ({ marketAnalysisId }) =>
      global.INFINICUS.BI.marketStore.get(
        "analyses",
        marketAnalysisId
      ),
    getAnalysisHandoff: ({ analysisHandoffId }) =>
      global.INFINICUS.BI.marketStore.get(
        "analysis_handoffs",
        analysisHandoffId
      ),
    listSignals: () =>
      global.INFINICUS.BI.marketStore.list("signals")
  });

  runtime.registerService(
    "bi.market_competitive_intelligence",
    api,
    { block: "BI-18" }
  );

  runtime.registerRoute(
    "bi.market_competitive_intelligence.analyze",
    analyze
  );

  global.INFINICUS.BI.marketCompetitiveIntelligenceEngine = api;
})(window);
