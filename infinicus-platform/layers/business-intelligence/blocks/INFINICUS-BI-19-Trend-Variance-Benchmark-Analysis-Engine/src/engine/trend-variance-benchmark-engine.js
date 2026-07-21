(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function analyze({
    domainHandoffs = [],
    timeSeries = [],
    targets = [],
    benchmarks = []
  } = {}) {
    const domains =
      global.INFINICUS.BI
        .domainIntelligenceConsolidator
        .consolidate(domainHandoffs);

    const trendResults = [];

    for (const item of timeSeries) {
      const trend =
        global.INFINICUS.BI
          .trendEngine
          .analyze(item.series || []);

      const record = {
        trendResultId:
          runtime.createId("bi_trend_result"),
        metricCode:
          item.metricCode,
        unit:
          item.unit || null,
        sourceBlock:
          item.sourceBlock || null,
        ...trend,
        createdAt:
          new Date().toISOString()
      };

      trendResults.push(record);

      await global.INFINICUS.BI
        .trendAnalysisStore
        .put("trend_results", record);
    }

    const varianceResults = [];

    for (const item of targets) {
      const result =
        global.INFINICUS.BI
          .varianceEngine
          .calculate(
            item.actual,
            item.target,
            item.direction
          );

      const record = {
        varianceResultId:
          runtime.createId("bi_variance_result"),
        metricCode:
          item.metricCode,
        referenceType:
          item.referenceType || "target",
        actual:
          item.actual,
        reference:
          item.target,
        unit:
          item.unit || null,
        ...result,
        createdAt:
          new Date().toISOString()
      };

      varianceResults.push(record);

      await global.INFINICUS.BI
        .trendAnalysisStore
        .put("variance_results", record);
    }

    const benchmarkResults = [];

    for (const item of benchmarks) {
      const result =
        global.INFINICUS.BI
          .benchmarkEngine
          .compare(
            item.actual,
            item.benchmark,
            item.direction
          );

      const record = {
        benchmarkResultId:
          runtime.createId("bi_benchmark_result"),
        metricCode:
          item.metricCode,
        actual:
          item.actual,
        benchmark:
          item.benchmark,
        benchmarkSource:
          item.benchmarkSource || null,
        benchmarkPeriod:
          item.benchmarkPeriod || null,
        unit:
          item.unit || null,
        ...result,
        createdAt:
          new Date().toISOString()
      };

      benchmarkResults.push(record);

      await global.INFINICUS.BI
        .trendAnalysisStore
        .put("benchmark_results", record);
    }

    const domainRanking =
      domains
        .filter(domain => Number.isFinite(Number(domain.health?.score)))
        .sort((a, b) =>
          Number(b.health.score) -
          Number(a.health.score)
        )
        .map((domain, index) => ({
          rank: index + 1,
          sourceBlock:
            domain.sourceBlock,
          score:
            domain.health.score,
          level:
            domain.health.level
        }));

    const analysisRun = {
      analysisRunId:
        runtime.createId("bi_trend_analysis_run"),
      correlationId:
        domainHandoffs.find(item => item.correlationId)?.correlationId ||
        runtime.createId("correlation"),
      domainCount:
        domains.length,
      trendCount:
        trendResults.length,
      varianceCount:
        varianceResults.length,
      benchmarkCount:
        benchmarkResults.length,
      domainRanking,
      status: "completed",
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .trendAnalysisStore
      .put("analysis_runs", analysisRun);

    const anomalyHandoff = {
      anomalyHandoffId:
        runtime.createId("bi_anomaly_handoff"),
      targetBlock: "BI-20",
      analysisRunId:
        analysisRun.analysisRunId,
      correlationId:
        analysisRun.correlationId,
      domains:
        domains.map(runtime.clone),
      trends:
        trendResults.map(runtime.clone),
      variances:
        varianceResults.map(runtime.clone),
      benchmarks:
        benchmarkResults.map(runtime.clone),
      domainRanking:
        domainRanking.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .trendAnalysisStore
      .put("anomaly_handoffs", anomalyHandoff);

    await runtime.emit(
      "bi.trend_variance_benchmark.completed",
      {
        analysisRun,
        anomalyHandoffId:
          anomalyHandoff.anomalyHandoffId
      }
    );

    return runtime.success({
      analysisRun,
      trendResults,
      varianceResults,
      benchmarkResults,
      anomalyHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysisRun: ({ analysisRunId }) =>
      global.INFINICUS.BI
        .trendAnalysisStore
        .get("analysis_runs", analysisRunId),
    getAnomalyHandoff: ({ anomalyHandoffId }) =>
      global.INFINICUS.BI
        .trendAnalysisStore
        .get("anomaly_handoffs", anomalyHandoffId),
    listTrendResults: () =>
      global.INFINICUS.BI
        .trendAnalysisStore
        .list("trend_results"),
    listVarianceResults: () =>
      global.INFINICUS.BI
        .trendAnalysisStore
        .list("variance_results"),
    listBenchmarkResults: () =>
      global.INFINICUS.BI
        .trendAnalysisStore
        .list("benchmark_results")
  });

  runtime.registerService(
    "bi.trend_variance_benchmark",
    api,
    { block: "BI-19" }
  );

  runtime.registerRoute(
    "bi.trend_variance_benchmark.analyze",
    analyze
  );

  global.INFINICUS.BI.trendVarianceBenchmarkEngine = api;
})(window);
