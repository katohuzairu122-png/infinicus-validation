(function (global) {
  "use strict";

  function detectCycle(graph, start) {
    const visited = new Set();
    const stack = new Set();

    function visit(node) {
      if (stack.has(node)) return true;
      if (visited.has(node)) return false;

      visited.add(node);
      stack.add(node);

      for (const dependency of graph.get(node) || []) {
        if (visit(dependency)) return true;
      }

      stack.delete(node);
      return false;
    }

    return visit(start);
  }

  function validate(metrics = [], candidate) {
    const graph = new Map(
      metrics.map(metric => [
        metric.metricId,
        [...(metric.dependencies || [])]
      ])
    );

    graph.set(
      candidate.metricId,
      [...(candidate.dependencies || [])]
    );

    const unknownDependencies =
      (candidate.dependencies || [])
        .filter(dependency =>
          !graph.has(dependency)
        );

    const circular =
      detectCycle(graph, candidate.metricId);

    return {
      valid:
        unknownDependencies.length === 0 &&
        !circular,
      unknownDependencies,
      circular
    };
  }

  global.INFINICUS.BI.metricDependencyValidator =
    Object.freeze({
      detectCycle,
      validate
    });
})(window);
