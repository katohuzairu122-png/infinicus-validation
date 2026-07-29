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

    const results =
      handoff.data.metricResults;

    const byCode =
      latestByCode(results);

    const profile = {
      revenue:
        read(byCode, ["revenue", "total_revenue", "sales_revenue"]),
      revenueGrowthPercent:
        read(byCode, ["revenue_growth_percent", "sales_growth_percent"]),
      conversionRatePercent:
        read(byCode, ["conversion_rate", "sales_conversion_rate"]),
      averageOrderValue:
        read(byCode, ["average_order_value", "aov"]),
      averageOrderValueGrowthPercent:
        read(byCode, ["average_order_value_growth_percent", "aov_growth_percent"]),
      winRatePercent:
        read(byCode, ["win_rate", "sales_win_rate"]),
      pipelineValue:
        read(byCode, ["pipeline_value"]),
      pipelineCoverage:
        read(byCode, ["pipeline_coverage"]),
      salesCycleDays:
        read(byCode, ["sales_cycle_days"]),
      topCustomerRevenueSharePercent:
        read(byCode, ["top_customer_revenue_share_percent"])
    };

    const health =
      global.INFINICUS.BI
        .salesHealthScorer
        .score(profile);

    const detected =
      global.INFINICUS.BI
        .salesSignalEngine
        .generate(profile);

    const productRanking =
      global.INFINICUS.BI
        .salesSegmentRanker
        .rank(results, [
          "revenue_by_product",
          "sales_by_product"
        ]);

    const channelRanking =
      global.INFINICUS.BI
        .salesSegmentRanker
        .rank(results, [
          "revenue_by_channel",
          "sales_by_channel"
        ]);

    const salesAnalysis = {
      salesAnalysisId:
        runtime.createId("bi_sales_analysis"),
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
      productRanking:
        productRanking.map(runtime.clone),
      channelRanking:
        channelRanking.map(runtime.clone),
      summary: {
        revenue:
          profile.revenue,
        growth:
          profile.revenueGrowthPercent != null
            ? `${profile.revenueGrowthPercent}%`
            : "insufficient data",
        conversion:
          profile.conversionRatePercent != null
            ? `${profile.conversionRatePercent}%`
            : "insufficient data",
        pipelineCoverage:
          profile.pipelineCoverage != null
            ? `${profile.pipelineCoverage}x`
            : "insufficient data"
      },
      sourceMetricCodes:
        [...new Set(results.map(result => result.metricCode))],
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .salesStore
      .put("analyses", salesAnalysis);

    const signals = [];

    for (const signal of detected) {
      const record = {
        salesSignalId:
          runtime.createId("bi_sales_signal"),
        salesAnalysisId:
          salesAnalysis.salesAnalysisId,
        ...runtime.clone(signal),
        status: "open"
      };

      signals.push(record);

      await global.INFINICUS.BI
        .salesStore
        .put("signals", record);
    }

    const analysisHandoff = {
      analysisHandoffId:
        runtime.createId("bi_analysis_handoff"),
      targetBlock: "BI-19",
      sourceBlock: "BI-12",
      salesAnalysisId:
        salesAnalysis.salesAnalysisId,
      calculationRunId:
        salesAnalysis.calculationRunId,
      correlationId:
        salesAnalysis.correlationId,
      salesHealth:
        runtime.clone(health),
      profile:
        runtime.clone(profile),
      productRanking:
        productRanking.map(runtime.clone),
      channelRanking:
        channelRanking.map(runtime.clone),
      signals:
        signals.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .salesStore
      .put("analysis_handoffs", analysisHandoff);

    await runtime.emit(
      "bi.sales_revenue_intelligence.completed",
      {
        salesAnalysis,
        analysisHandoffId:
          analysisHandoff.analysisHandoffId
      }
    );

    return runtime.success({
      salesAnalysis,
      signals,
      analysisHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysis: ({ salesAnalysisId }) =>
      global.INFINICUS.BI.salesStore.get(
        "analyses",
        salesAnalysisId
      ),
    getAnalysisHandoff: ({ analysisHandoffId }) =>
      global.INFINICUS.BI.salesStore.get(
        "analysis_handoffs",
        analysisHandoffId
      ),
    listSignals: () =>
      global.INFINICUS.BI.salesStore.list("signals")
  });

  runtime.registerService(
    "bi.sales_revenue_intelligence",
    api,
    { block: "BI-12" }
  );

  runtime.registerRoute(
    "bi.sales_revenue_intelligence.analyze",
    analyze
  );

  global.INFINICUS.BI.salesRevenueIntelligenceEngine = api;
})(window);
