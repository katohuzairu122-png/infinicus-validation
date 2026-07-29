(function (global) {
  "use strict";

  const METRIC_TYPES = Object.freeze([
    "base",
    "derived",
    "ratio",
    "rate",
    "target"
  ]);

  const AGGREGATIONS = Object.freeze([
    "sum",
    "count",
    "count_distinct",
    "average",
    "minimum",
    "maximum",
    "median",
    "first",
    "last"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.BI.runtime;
    const metricType = String(input.metricType || "");
    const aggregation = String(input.aggregation || "");

    if (
      !input.name ||
      !input.code ||
      !input.warehouseDatasetId ||
      !METRIC_TYPES.includes(metricType)
    ) {
      return runtime.failure(
        "METRIC_DEFINITION_INVALID",
        "name, code, warehouseDatasetId, and a supported metricType are required."
      );
    }

    if (
      metricType === "base" &&
      !AGGREGATIONS.includes(aggregation)
    ) {
      return runtime.failure(
        "METRIC_AGGREGATION_INVALID",
        "Base metrics require a supported aggregation."
      );
    }

    return runtime.success({
      metricId:
        input.metricId ||
        runtime.createId("bi_metric"),
      name:
        String(input.name),
      code:
        String(input.code)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_"),
      description:
        String(input.description || ""),
      metricType,
      warehouseDatasetId:
        String(input.warehouseDatasetId),
      sourceField:
        input.sourceField || null,
      aggregation:
        aggregation || null,
      dependencies:
        Array.isArray(input.dependencies)
          ? [...new Set(input.dependencies.map(String))]
          : [],
      formula:
        runtime.clone(input.formula || null),
      filters:
        runtime.clone(input.filters || []),
      dimensions:
        Array.isArray(input.dimensions)
          ? input.dimensions.map(String)
          : [],
      timeGrain:
        String(input.timeGrain || "all_time"),
      unit:
        String(input.unit || "number"),
      currency:
        input.currency || null,
      target:
        input.target ?? null,
      thresholds:
        runtime.clone(input.thresholds || {}),
      owner:
        String(input.owner || ""),
      governanceStatus:
        String(input.governanceStatus || "draft"),
      version:
        Math.max(1, Number(input.version || 1)),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.BI.metricDefinitionModel =
    Object.freeze({
      METRIC_TYPES,
      AGGREGATIONS,
      create
    });
})(window);
