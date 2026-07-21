(function (global) {
  "use strict";

  const runtime = global.INFINICUS.BI.runtime;

  async function registerMetric(input = {}) {
    const dataset =
      await global.INFINICUS.BI
        .dataWarehouseEngine
        .getDataset({
          warehouseDatasetId:
            input.warehouseDatasetId
        });

    if (!dataset.ok) return dataset;

    const built =
      global.INFINICUS.BI
        .metricDefinitionModel
        .create(input);

    if (!built.ok) return built;

    const existing =
      await global.INFINICUS.BI
        .metricStore
        .list("metrics");

    if (!existing.ok) return existing;

    const validation =
      global.INFINICUS.BI
        .metricDependencyValidator
        .validate(existing.data, built.data);

    if (!validation.valid) {
      return runtime.failure(
        "METRIC_DEPENDENCY_INVALID",
        "Metric dependencies are invalid.",
        validation
      );
    }

    const duplicate =
      existing.data.find(metric =>
        metric.code === built.data.code
      );

    if (duplicate) {
      return runtime.failure(
        "METRIC_CODE_DUPLICATE",
        `Metric code already exists: ${built.data.code}`
      );
    }

    const stored =
      await global.INFINICUS.BI
        .metricStore
        .put("metrics", built.data);

    if (!stored.ok) return stored;

    const lineage = {
      metricLineageId:
        runtime.createId("bi_metric_lineage"),
      ...global.INFINICUS.BI
        .metricLineageBuilder
        .build(built.data, dataset.data)
    };

    await global.INFINICUS.BI
      .metricStore
      .put("lineage", lineage);

    runtime.registerMetric(
      built.data.code,
      built.data,
      {
        metricId:
          built.data.metricId,
        metricType:
          built.data.metricType,
        unit:
          built.data.unit
      }
    );

    await runtime.emit(
      "bi.metric.registered",
      {
        metric:
          built.data,
        lineage
      }
    );

    return runtime.success({
      metric:
        built.data,
      lineage
    });
  }

  async function publishCalculationHandoff({
    metricIds = [],
    warehouseSnapshotId = null,
    correlationId = null
  } = {}) {
    const all =
      await global.INFINICUS.BI
        .metricStore
        .list("metrics");

    if (!all.ok) return all;

    const selected =
      metricIds.length
        ? all.data.filter(metric =>
            metricIds.includes(metric.metricId)
          )
        : all.data.filter(metric =>
            metric.status === "active" &&
            metric.governanceStatus === "approved"
          );

    if (!selected.length) {
      return runtime.failure(
        "NO_METRICS_SELECTED",
        "No approved active metrics were selected."
      );
    }

    const handoff = {
      calculationHandoffId:
        runtime.createId("bi_calculation_handoff"),
      targetBlock: "BI-10",
      warehouseSnapshotId,
      correlationId:
        correlationId ||
        runtime.createId("correlation"),
      metrics:
        selected.map(runtime.clone),
      metricVersions:
        selected.map(metric => ({
          metricId:
            metric.metricId,
          version:
            metric.version
        })),
      status: "ready",
      createdAt:
        new Date().toISOString()
    };

    const stored =
      await global.INFINICUS.BI
        .metricStore
        .put(
          "calculation_handoffs",
          handoff
        );

    if (stored.ok) {
      await runtime.emit(
        "bi.metric_calculation_handoff.published",
        stored.data
      );
    }

    return stored;
  }

  const api = Object.freeze({
    registerMetric,
    publishCalculationHandoff,
    getMetric: ({ metricId }) =>
      global.INFINICUS.BI
        .metricStore
        .get("metrics", metricId),
    getMetricByCode: ({ code }) =>
      global.INFINICUS.BI
        .metricStore
        .getByCode(code),
    getCalculationHandoff: ({ calculationHandoffId }) =>
      global.INFINICUS.BI
        .metricStore
        .get(
          "calculation_handoffs",
          calculationHandoffId
        ),
    listMetrics: () =>
      global.INFINICUS.BI
        .metricStore
        .list("metrics")
  });

  runtime.registerService(
    "bi.metric_registry",
    api,
    { block: "BI-09" }
  );

  runtime.registerRoute(
    "bi.metric.register",
    registerMetric
  );

  runtime.registerRoute(
    "bi.metric_calculation_handoff.publish",
    publishCalculationHandoff
  );

  global.INFINICUS.BI.metricRegistryEngine = api;
})(window);
