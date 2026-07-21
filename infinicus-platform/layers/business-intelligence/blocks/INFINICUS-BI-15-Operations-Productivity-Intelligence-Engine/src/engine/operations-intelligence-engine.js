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

  async function analyze({ intelligenceHandoffId } = {}) {
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
      throughput:
        read(byCode, ["throughput", "units_completed"]),
      throughputGrowthPercent:
        read(byCode, ["throughput_growth_percent"]),
      averageCycleTime:
        read(byCode, ["average_cycle_time", "cycle_time"]),
      cycleTimeVariancePercent:
        read(byCode, ["cycle_time_variance_percent"]),
      capacityUtilizationPercent:
        read(byCode, ["capacity_utilization", "capacity_utilization_percent"]),
      productivityPerResource:
        read(byCode, ["productivity_per_resource", "output_per_employee"]),
      productivityGrowthPercent:
        read(byCode, ["productivity_growth_percent"]),
      slaCompliancePercent:
        read(byCode, ["sla_compliance", "sla_compliance_percent"]),
      defectRatePercent:
        read(byCode, ["defect_rate", "defect_rate_percent"]),
      reworkRatePercent:
        read(byCode, ["rework_rate", "rework_rate_percent"]),
      downtimePercent:
        read(byCode, ["downtime_percent"])
    };

    const health =
      global.INFINICUS.BI
        .operationsHealthScorer
        .score(profile);

    const detected =
      global.INFINICUS.BI
        .operationsSignalEngine
        .generate(profile);

    const processRanking =
      global.INFINICUS.BI
        .operationsRanker
        .rank(results, [
          "throughput_by_process",
          "productivity_by_process",
          "sla_compliance_by_process"
        ]);

    const locationRanking =
      global.INFINICUS.BI
        .operationsRanker
        .rank(results, [
          "throughput_by_location",
          "productivity_by_location",
          "sla_compliance_by_location"
        ]);

    const bottleneckRanking =
      global.INFINICUS.BI
        .operationsRanker
        .rank(results, [
          "cycle_time_by_process",
          "downtime_by_process",
          "queue_time_by_process"
        ])
        .reverse();

    const operationsAnalysis = {
      operationsAnalysisId:
        runtime.createId("bi_operations_analysis"),
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
      processRanking:
        processRanking.map(runtime.clone),
      locationRanking:
        locationRanking.map(runtime.clone),
      bottleneckRanking:
        bottleneckRanking.map(runtime.clone),
      summary: {
        throughput:
          profile.throughput,
        cycleTime:
          profile.averageCycleTime,
        utilization:
          profile.capacityUtilizationPercent != null
            ? `${profile.capacityUtilizationPercent}%`
            : "insufficient data",
        slaCompliance:
          profile.slaCompliancePercent != null
            ? `${profile.slaCompliancePercent}%`
            : "insufficient data"
      },
      sourceMetricCodes:
        [...new Set(results.map(result => result.metricCode))],
      status: "completed",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .operationsStore
      .put("analyses", operationsAnalysis);

    const signals = [];

    for (const signal of detected) {
      const record = {
        operationsSignalId:
          runtime.createId("bi_operations_signal"),
        operationsAnalysisId:
          operationsAnalysis.operationsAnalysisId,
        ...runtime.clone(signal),
        status: "open"
      };

      signals.push(record);

      await global.INFINICUS.BI
        .operationsStore
        .put("signals", record);
    }

    const analysisHandoff = {
      analysisHandoffId:
        runtime.createId("bi_analysis_handoff"),
      targetBlock: "BI-19",
      sourceBlock: "BI-15",
      operationsAnalysisId:
        operationsAnalysis.operationsAnalysisId,
      calculationRunId:
        operationsAnalysis.calculationRunId,
      correlationId:
        operationsAnalysis.correlationId,
      operationsHealth:
        runtime.clone(health),
      profile:
        runtime.clone(profile),
      processRanking:
        processRanking.map(runtime.clone),
      locationRanking:
        locationRanking.map(runtime.clone),
      bottleneckRanking:
        bottleneckRanking.map(runtime.clone),
      signals:
        signals.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .operationsStore
      .put("analysis_handoffs", analysisHandoff);

    await runtime.emit(
      "bi.operations_intelligence.completed",
      {
        operationsAnalysis,
        analysisHandoffId:
          analysisHandoff.analysisHandoffId
      }
    );

    return runtime.success({
      operationsAnalysis,
      signals,
      analysisHandoff
    });
  }

  const api = Object.freeze({
    analyze,
    getAnalysis: ({ operationsAnalysisId }) =>
      global.INFINICUS.BI.operationsStore.get(
        "analyses",
        operationsAnalysisId
      ),
    getAnalysisHandoff: ({ analysisHandoffId }) =>
      global.INFINICUS.BI.operationsStore.get(
        "analysis_handoffs",
        analysisHandoffId
      ),
    listSignals: () =>
      global.INFINICUS.BI.operationsStore.list("signals")
  });

  runtime.registerService(
    "bi.operations_intelligence",
    api,
    { block: "BI-15" }
  );

  runtime.registerRoute(
    "bi.operations_intelligence.analyze",
    analyze
  );

  global.INFINICUS.BI.operationsIntelligenceEngine = api;
})(window);
