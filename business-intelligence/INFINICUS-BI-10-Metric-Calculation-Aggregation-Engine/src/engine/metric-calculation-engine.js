(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function execute({
    calculationHandoffId
  } = {}) {
    const handoff =
      await global.INFINICUS.BI
        .metricRegistryEngine
        .getCalculationHandoff({
          calculationHandoffId
        });

    if (!handoff.ok) return handoff;

    let ordered;

    try {
      ordered =
        global.INFINICUS.BI
          .metricDependencyOrder
          .resolve(handoff.data.metrics);
    } catch (error) {
      return runtime.failure(
        "METRIC_DEPENDENCY_ORDER_FAILED",
        error?.message || "Metric dependency ordering failed."
      );
    }

    const resultsByMetricId = new Map();
    const allResults = [];

    for (const metric of ordered) {
      const datasetRows =
        await global.INFINICUS.BI
          .dataWarehouseEngine
          .query({
            warehouseDatasetId:
              metric.warehouseDatasetId,
            filter: {},
            limit: 100000
          });

      if (!datasetRows.ok) return datasetRows;

      const records =
        datasetRows.data.map(row => row.record);

      const filtered =
        global.INFINICUS.BI
          .metricFilterEngine
          .apply(records, metric.filters);

      const groups =
        global.INFINICUS.BI
          .metricGroupingEngine
          .group(filtered, metric);

      const metricResults = new Map();

      if (
        metric.metricType === "base"
      ) {
        for (const [groupKey, groupRecords] of groups.entries()) {
          const value =
            global.INFINICUS.BI
              .metricAggregationEngine
              .aggregate(groupRecords, metric);

          const threshold =
            global.INFINICUS.BI
              .metricThresholdEvaluator
              .evaluate(value, metric);

          const result = {
            metricResultId:
              runtime.createId("bi_metric_result"),
            calculationHandoffId,
            metricId:
              metric.metricId,
            metricCode:
              metric.code,
            metricVersion:
              metric.version,
            groupKey,
            value,
            unit:
              metric.unit,
            currency:
              metric.currency,
            target:
              metric.target,
            threshold,
            sourceRowCount:
              groupRecords.length,
            calculatedAt:
              new Date().toISOString()
          };

          metricResults.set(groupKey, result);
          allResults.push(result);

          await global.INFINICUS.BI
            .calculationStore
            .put("metric_results", result);
        }
      } else {
        const dependencyGroupKeys =
          new Set(
            (metric.dependencies || [])
              .flatMap(metricId =>
                [...(resultsByMetricId.get(metricId)?.keys() || [])]
              )
          );

        if (!dependencyGroupKeys.size) {
          dependencyGroupKeys.add("__all__");
        }

        for (const groupKey of dependencyGroupKeys) {
          let value;

          try {
            value =
              global.INFINICUS.BI
                .derivedMetricEngine
                .calculate(
                  metric,
                  resultsByMetricId,
                  groupKey
                );
          } catch (error) {
            return runtime.failure(
              "DERIVED_METRIC_FAILED",
              error?.message || "Derived metric calculation failed.",
              {
                metricId:
                  metric.metricId,
                groupKey
              }
            );
          }

          const threshold =
            global.INFINICUS.BI
              .metricThresholdEvaluator
              .evaluate(value, metric);

          const result = {
            metricResultId:
              runtime.createId("bi_metric_result"),
            calculationHandoffId,
            metricId:
              metric.metricId,
            metricCode:
              metric.code,
            metricVersion:
              metric.version,
            groupKey,
            value,
            unit:
              metric.unit,
            currency:
              metric.currency,
            target:
              metric.target,
            threshold,
            sourceRowCount:
              null,
            calculatedAt:
              new Date().toISOString()
          };

          metricResults.set(groupKey, result);
          allResults.push(result);

          await global.INFINICUS.BI
            .calculationStore
            .put("metric_results", result);
        }
      }

      resultsByMetricId.set(
        metric.metricId,
        metricResults
      );
    }

    const calculationRun = {
      calculationRunId:
        runtime.createId("bi_calculation_run"),
      calculationHandoffId,
      warehouseSnapshotId:
        handoff.data.warehouseSnapshotId,
      correlationId:
        handoff.data.correlationId,
      metricCount:
        ordered.length,
      resultCount:
        allResults.length,
      status: "completed",
      startedAt:
        new Date().toISOString(),
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .calculationStore
      .put("calculation_runs", calculationRun);

    const intelligenceHandoff = {
      intelligenceHandoffId:
        runtime.createId("bi_intelligence_handoff"),
      targetBlocks: [
        "BI-11",
        "BI-12",
        "BI-13",
        "BI-14",
        "BI-15",
        "BI-16",
        "BI-17",
        "BI-18"
      ],
      calculationRunId:
        calculationRun.calculationRunId,
      warehouseSnapshotId:
        calculationRun.warehouseSnapshotId,
      correlationId:
        calculationRun.correlationId,
      metricResults:
        allResults.map(runtime.clone),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.BI
      .calculationStore
      .put(
        "intelligence_handoffs",
        intelligenceHandoff
      );

    await runtime.emit(
      "bi.metric_calculation.completed",
      {
        calculationRun,
        intelligenceHandoffId:
          intelligenceHandoff.intelligenceHandoffId
      }
    );

    return runtime.success({
      calculationRun,
      intelligenceHandoff,
      metricResults:
        allResults
    });
  }

  const api = Object.freeze({
    execute,
    getCalculationRun: ({ calculationRunId }) =>
      global.INFINICUS.BI
        .calculationStore
        .get("calculation_runs", calculationRunId),
    getIntelligenceHandoff: ({ intelligenceHandoffId }) =>
      global.INFINICUS.BI
        .calculationStore
        .get(
          "intelligence_handoffs",
          intelligenceHandoffId
        ),
    listMetricResults: () =>
      global.INFINICUS.BI
        .calculationStore
        .list("metric_results")
  });

  runtime.registerService(
    "bi.metric_calculation",
    api,
    { block: "BI-10" }
  );

  runtime.registerRoute(
    "bi.metric_calculation.execute",
    execute
  );

  global.INFINICUS.BI.metricCalculationEngine = api;
})(window);
