(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  function latestByCode(results = []) {
    const map = new Map();

    for (const result of results) {
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

    const byCode =
      latestByCode(handoff.data.metricResults);

    const profile = {
      revenue:
        read(byCode, ["revenue", "total_revenue", "sales_revenue"]),
      grossProfit:
        read(byCode, ["gross_profit"]),
      netProfit:
        read(byCode, ["net_profit", "net_income"]),
      grossMargin:
        read(byCode, ["gross_margin"]),
      netProfitMargin:
        read(byCode, ["net_profit_margin", "net_margin"]),
      operatingCashFlow:
        read(byCode, ["operating_cash_flow"]),
      currentRatio:
        read(byCode, ["current_ratio"]),
      quickRatio:
        read(byCode, ["quick_ratio"]),
      burnRate:
        read(byCode, ["burn_rate", "monthly_burn"]),
      runwayMonths:
        read(byCode, ["runway_months", "cash_runway"]),
      budgetVariancePercent:
        read(byCode, ["budget_variance_percent"])
    };

    const health =
      global.INFINICUS.BI
        .financialHealthScorer
        .score(profile);

    const detected =
      global.INFINICUS.BI
        .financialSignalEngine
        .generate(profile);

    const financialAnalysis = {
      financialAnalysisId:
        runtime.createId("bi_financial_analysis"),
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
      summary: {
        revenue:
          profile.revenue,
        profitability:
          profile.netProfitMargin != null
            ? `${profile.netProfitMargin}% net margin`
            : "insufficient data",
        liquidity:
          profile.currentRatio != null
            ? `current ratio ${profile.currentRatio}`
            : "insufficient data",
        runway:
          profile.runwayMonths != null
            ? `${profile.runwayMonths} months`
            : "insufficient data"
      },
      sourceMetricCodes:
        [...byCode.keys()],
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .financialStore
      .put("analyses", financialAnalysis);

    const signals = [];

    for (const signal of detected) {
      const record = {
        financialSignalId:
          runtime.createId("bi_financial_signal"),
        financialAnalysisId:
          financialAnalysis.financialAnalysisId,
        ...runtime.clone(signal),
        status: "open"
      };

      signals.push(record);

      await global.INFINICUS.BI
        .financialStore
        .put("signals", record);
    }

    const analysisHandoff = {
      analysisHandoffId:
        runtime.createId("bi_analysis_handoff"),
      targetBlock: "BI-19",
      sourceBlock: "BI-11",
      financialAnalysisId:
        financialAnalysis.financialAnalysisId,
      calculationRunId:
        financialAnalysis.calculationRunId,
      correlationId:
        financialAnalysis.correlationId,
      financialHealth:
        runtime.clone(health),
      profile:
        runtime.clone(profile),
      signals:
        signals.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .financialStore
      .put("analysis_handoffs", analysisHandoff);

    await runtime.emit(
      "bi.financial_intelligence.completed",
      {
        financialAnalysis,
        analysisHandoffId:
          analysisHandoff.analysisHandoffId
      }
    );

    return runtime.success({
      financialAnalysis,
      signals,
      analysisHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysis: ({ financialAnalysisId }) =>
      global.INFINICUS.BI.financialStore.get(
        "analyses",
        financialAnalysisId
      ),
    getAnalysisHandoff: ({ analysisHandoffId }) =>
      global.INFINICUS.BI.financialStore.get(
        "analysis_handoffs",
        analysisHandoffId
      ),
    listSignals: () =>
      global.INFINICUS.BI.financialStore.list("signals")
  });

  runtime.registerService(
    "bi.financial_intelligence",
    api,
    { block: "BI-11" }
  );

  runtime.registerRoute(
    "bi.financial_intelligence.analyze",
    analyze
  );

  global.INFINICUS.BI.financialIntelligenceEngine = api;
})(window);
