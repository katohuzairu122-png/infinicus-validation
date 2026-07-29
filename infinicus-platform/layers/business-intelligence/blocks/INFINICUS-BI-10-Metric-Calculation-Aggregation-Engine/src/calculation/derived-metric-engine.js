(function (global) {
  "use strict";

  function calculate(metric, resultsByMetricId, groupKey) {
    const values =
      (metric.dependencies || []).map(metricId =>
        resultsByMetricId
          .get(metricId)
          ?.get(groupKey)
          ?.value
      );

    const operator =
      metric.formula?.operator;

    if (metric.metricType === "ratio") {
      return values[1]
        ? values[0] / values[1]
        : null;
    }

    if (metric.metricType === "rate") {
      return values[1]
        ? values[0] / values[1] * 100
        : null;
    }

    if (metric.metricType === "target") {
      return metric.target;
    }

    switch (operator) {
      case "add":
        return values.reduce((a, b) => Number(a || 0) + Number(b || 0), 0);

      case "subtract":
        return values.slice(1).reduce(
          (a, b) => Number(a || 0) - Number(b || 0),
          Number(values[0] || 0)
        );

      case "multiply":
        return values.reduce(
          (a, b) => Number(a || 0) * Number(b || 0),
          1
        );

      case "divide":
        return values[1]
          ? Number(values[0] || 0) /
            Number(values[1])
          : null;

      default:
        throw new Error(
          `Unsupported derived metric operator: ${operator}`
        );
    }
  }

  global.INFINICUS.BI.derivedMetricEngine =
    Object.freeze({ calculate });
})(window);
