(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  function latestByCode(results = []) {
    const map = new Map();

    for (const result of results) {
      if (result.groupKey !== "__all__") continue;

      const existing = map.get(result.metricCode);

      if (
        !existing ||
        new Date(result.calculatedAt) >
        new Date(existing.calculatedAt)
      ) {
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

  async function analyze({
    intelligenceHandoffId
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .metricCalculationEngine
        .getIntelligenceHandoff({
          intelligenceHandoffId
        });

    if (!handoff.ok) return handoff;

    const results = handoff.data.metricResults;
    const byCode = latestByCode(results);

    const profile = {
      reach:
        read(byCode, ["reach", "marketing_reach"]),
      impressions:
        read(byCode, ["impressions", "marketing_impressions"]),
      engagementRatePercent:
        read(byCode, ["engagement_rate", "marketing_engagement_rate"]),
      leads:
        read(byCode, ["leads", "marketing_leads"]),
      marketingConversionRatePercent:
        read(byCode, ["marketing_conversion_rate", "lead_conversion_rate"]),
      customerAcquisitionCost:
        read(byCode, ["customer_acquisition_cost", "cac"]),
      customerAcquisitionCostTrendPercent:
        read(byCode, ["customer_acquisition_cost_trend_percent", "cac_trend_percent"]),
      returnOnAdSpend:
        read(byCode, ["return_on_ad_spend", "roas"]),
      marketingRoiPercent:
        read(byCode, ["marketing_roi_percent", "campaign_roi_percent"]),
      costPerLead:
        read(byCode, ["cost_per_lead", "cpl"]),
      organicTrafficGrowthPercent:
        read(byCode, ["organic_traffic_growth_percent"])
    };

    const health =
      global.INFINICUS.BI
        .marketingHealthScorer
        .score(profile);

    const detected =
      global.INFINICUS.BI
        .marketingSignalEngine
        .generate(profile);

    const campaignRanking =
      global.INFINICUS.BI
        .marketingRanker
        .rank(results, [
          "return_on_ad_spend_by_campaign",
          "conversion_rate_by_campaign",
          "revenue_by_campaign"
        ]);

    const channelRanking =
      global.INFINICUS.BI
        .marketingRanker
        .rank(results, [
          "return_on_ad_spend_by_channel",
          "conversion_rate_by_channel",
          "revenue_by_marketing_channel"
        ]);

    const audienceRanking =
      global.INFINICUS.BI
        .marketingRanker
        .rank(results, [
          "conversion_rate_by_audience",
          "engagement_rate_by_audience"
        ]);

    const marketingAnalysis = {
      marketingAnalysisId:
        runtime.createId("bi_marketing_analysis"),
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
      campaignRanking:
        campaignRanking.map(runtime.clone),
      channelRanking:
        channelRanking.map(runtime.clone),
      audienceRanking:
        audienceRanking.map(runtime.clone),
      summary: {
        reach:
          profile.reach,
        conversion:
          profile.marketingConversionRatePercent != null
            ? `${profile.marketingConversionRatePercent}%`
            : "insufficient data",
        acquisitionCost:
          profile.customerAcquisitionCost,
        roas:
          profile.returnOnAdSpend != null
            ? `${profile.returnOnAdSpend}x`
            : "insufficient data"
      },
      sourceMetricCodes:
        [...new Set(results.map(result => result.metricCode))],
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .marketingStore
      .put("analyses", marketingAnalysis);

    const signals = [];

    for (const signal of detected) {
      const record = {
        marketingSignalId:
          runtime.createId("bi_marketing_signal"),
        marketingAnalysisId:
          marketingAnalysis.marketingAnalysisId,
        ...runtime.clone(signal),
        status: "open"
      };

      signals.push(record);

      await global.INFINICUS.BI
        .marketingStore
        .put("signals", record);
    }

    const analysisHandoff = {
      analysisHandoffId:
        runtime.createId("bi_analysis_handoff"),
      targetBlock: "BI-19",
      sourceBlock: "BI-14",
      marketingAnalysisId:
        marketingAnalysis.marketingAnalysisId,
      calculationRunId:
        marketingAnalysis.calculationRunId,
      correlationId:
        marketingAnalysis.correlationId,
      marketingHealth:
        runtime.clone(health),
      profile:
        runtime.clone(profile),
      campaignRanking:
        campaignRanking.map(runtime.clone),
      channelRanking:
        channelRanking.map(runtime.clone),
      audienceRanking:
        audienceRanking.map(runtime.clone),
      signals:
        signals.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .marketingStore
      .put("analysis_handoffs", analysisHandoff);

    await runtime.emit(
      "bi.marketing_intelligence.completed",
      {
        marketingAnalysis,
        analysisHandoffId:
          analysisHandoff.analysisHandoffId
      }
    );

    return runtime.success({
      marketingAnalysis,
      signals,
      analysisHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysis: ({ marketingAnalysisId }) =>
      global.INFINICUS.BI.marketingStore.get(
        "analyses",
        marketingAnalysisId
      ),
    getAnalysisHandoff: ({ analysisHandoffId }) =>
      global.INFINICUS.BI.marketingStore.get(
        "analysis_handoffs",
        analysisHandoffId
      ),
    listSignals: () =>
      global.INFINICUS.BI.marketingStore.list("signals")
  });

  runtime.registerService(
    "bi.marketing_intelligence",
    api,
    { block: "BI-14" }
  );

  runtime.registerRoute(
    "bi.marketing_intelligence.analyze",
    analyze
  );

  global.INFINICUS.BI.marketingIntelligenceEngine = api;
})(window);
