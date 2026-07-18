(function (global) {
  "use strict";

  function resolve(metrics = []) {
    const byId =
      new Map(
        metrics.map(metric => [metric.metricId, metric])
      );

    const visited = new Set();
    const temporary = new Set();
    const order = [];

    function visit(metricId) {
      if (visited.has(metricId)) return;

      if (temporary.has(metricId)) {
        throw new Error(
          `Circular metric dependency detected: ${metricId}`
        );
      }

      temporary.add(metricId);

      const metric = byId.get(metricId);

      if (!metric) {
        throw new Error(
          `Unknown metric dependency: ${metricId}`
        );
      }

      for (const dependency of metric.dependencies || []) {
        visit(dependency);
      }

      temporary.delete(metricId);
      visited.add(metricId);
      order.push(metric);
    }

    for (const metric of metrics) {
      visit(metric.metricId);
    }

    return order;
  }

  global.INFINICUS.BI.metricDependencyOrder =
    Object.freeze({ resolve });
})(window);
