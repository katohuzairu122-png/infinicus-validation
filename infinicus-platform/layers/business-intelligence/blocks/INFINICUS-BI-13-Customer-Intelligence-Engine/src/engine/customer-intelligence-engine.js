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
      acquiredCustomers:
        read(byCode, ["acquired_customers", "new_customers"]),
      activationRatePercent:
        read(byCode, ["activation_rate", "customer_activation_rate"]),
      retentionRatePercent:
        read(byCode, ["retention_rate", "customer_retention_rate"]),
      churnRatePercent:
        read(byCode, ["churn_rate", "customer_churn_rate"]),
      customerLifetimeValue:
        read(byCode, ["customer_lifetime_value", "clv", "ltv"]),
      customerLifetimeValueGrowthPercent:
        read(byCode, ["customer_lifetime_value_growth_percent", "ltv_growth_percent"]),
      repeatPurchaseRatePercent:
        read(byCode, ["repeat_purchase_rate"]),
      purchaseFrequency:
        read(byCode, ["purchase_frequency"]),
      customerSatisfactionScore:
        read(byCode, ["customer_satisfaction_score", "csat"]),
      netPromoterScore:
        read(byCode, ["net_promoter_score", "nps"]),
      topCustomerRevenueSharePercent:
        read(byCode, ["top_customer_revenue_share_percent"])
    };

    const health =
      global.INFINICUS.BI
        .customerHealthScorer
        .score(profile);

    const detected =
      global.INFINICUS.BI
        .customerSignalEngine
        .generate(profile);

    const cohortRanking =
      global.INFINICUS.BI
        .customerCohortRanker
        .rank(results, [
          "retention_rate_by_cohort",
          "customer_lifetime_value_by_cohort",
          "revenue_by_customer_segment"
        ]);

    const customerAnalysis = {
      customerAnalysisId:
        runtime.createId("bi_customer_analysis"),
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
      cohortRanking:
        cohortRanking.map(runtime.clone),
      summary: {
        acquisition:
          profile.acquiredCustomers,
        retention:
          profile.retentionRatePercent != null
            ? `${profile.retentionRatePercent}%`
            : "insufficient data",
        churn:
          profile.churnRatePercent != null
            ? `${profile.churnRatePercent}%`
            : "insufficient data",
        lifetimeValue:
          profile.customerLifetimeValue
      },
      sourceMetricCodes:
        [...new Set(results.map(result => result.metricCode))],
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .customerStore
      .put("analyses", customerAnalysis);

    const signals = [];

    for (const signal of detected) {
      const record = {
        customerSignalId:
          runtime.createId("bi_customer_signal"),
        customerAnalysisId:
          customerAnalysis.customerAnalysisId,
        ...runtime.clone(signal),
        status: "open"
      };

      signals.push(record);

      await global.INFINICUS.BI
        .customerStore
        .put("signals", record);
    }

    const analysisHandoff = {
      analysisHandoffId:
        runtime.createId("bi_analysis_handoff"),
      targetBlock: "BI-19",
      sourceBlock: "BI-13",
      customerAnalysisId:
        customerAnalysis.customerAnalysisId,
      calculationRunId:
        customerAnalysis.calculationRunId,
      correlationId:
        customerAnalysis.correlationId,
      customerHealth:
        runtime.clone(health),
      profile:
        runtime.clone(profile),
      cohortRanking:
        cohortRanking.map(runtime.clone),
      signals:
        signals.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .customerStore
      .put("analysis_handoffs", analysisHandoff);

    await runtime.emit(
      "bi.customer_intelligence.completed",
      {
        customerAnalysis,
        analysisHandoffId:
          analysisHandoff.analysisHandoffId
      }
    );

    return runtime.success({
      customerAnalysis,
      signals,
      analysisHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysis: ({ customerAnalysisId }) =>
      global.INFINICUS.BI.customerStore.get(
        "analyses",
        customerAnalysisId
      ),
    getAnalysisHandoff: ({ analysisHandoffId }) =>
      global.INFINICUS.BI.customerStore.get(
        "analysis_handoffs",
        analysisHandoffId
      ),
    listSignals: () =>
      global.INFINICUS.BI.customerStore.list("signals")
  });

  runtime.registerService(
    "bi.customer_intelligence",
    api,
    { block: "BI-13" }
  );

  runtime.registerRoute(
    "bi.customer_intelligence.analyze",
    analyze
  );

  global.INFINICUS.BI.customerIntelligenceEngine = api;
})(window);
