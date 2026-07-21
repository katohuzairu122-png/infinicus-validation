(function (global) {
  "use strict";

  function median(values) {
    const sorted =
      [...values].sort((a, b) => a - b);

    if (!sorted.length) return null;

    const middle =
      Math.floor(sorted.length / 2);

    return sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function aggregate(records, metric) {
    const field =
      metric.sourceField;

    const values =
      records
        .map(record => field ? record[field] : 1)
        .filter(value => value != null);

    switch (metric.aggregation) {
      case "sum":
        return values.reduce(
          (sum, value) => sum + Number(value || 0),
          0
        );

      case "count":
        return records.length;

      case "count_distinct":
        return new Set(values).size;

      case "average": {
        const numeric =
          values
            .map(Number)
            .filter(Number.isFinite);

        return numeric.length
          ? numeric.reduce((a, b) => a + b, 0) /
            numeric.length
          : null;
      }

      case "minimum":
        return values.length
          ? Math.min(...values.map(Number))
          : null;

      case "maximum":
        return values.length
          ? Math.max(...values.map(Number))
          : null;

      case "median":
        return median(
          values
            .map(Number)
            .filter(Number.isFinite)
        );

      case "first":
        return values[0] ?? null;

      case "last":
        return values.at(-1) ?? null;

      default:
        throw new Error(
          `Unsupported aggregation: ${metric.aggregation}`
        );
    }
  }

  global.INFINICUS.BI.metricAggregationEngine =
    Object.freeze({
      median,
      aggregate
    });
})(window);
