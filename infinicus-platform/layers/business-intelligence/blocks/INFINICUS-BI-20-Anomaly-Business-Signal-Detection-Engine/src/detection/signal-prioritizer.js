(function (global) {
  "use strict";

  const SEVERITY_WEIGHT = Object.freeze({
    info: 1,
    opportunity: 2,
    warning: 3,
    critical: 4
  });

  function prioritize(signals = []) {
    const unique = new Map();

    for (const signal of signals) {
      const key = [
        signal.code,
        signal.metricCode,
        signal.sourceBlock
      ].join("|");

      const existing = unique.get(key);

      if (
        !existing ||
        Number(signal.priorityScore) >
        Number(existing.priorityScore)
      ) {
        unique.set(key, signal);
      }
    }

    return [...unique.values()]
      .sort((a, b) =>
        Number(b.priorityScore) -
        Number(a.priorityScore)
      );
  }

  function score(severity, confidence) {
    return Number((
      (SEVERITY_WEIGHT[severity] || 1) *
      Math.max(0, Math.min(1, Number(confidence || 0))) *
      25
    ).toFixed(2));
  }

  global.INFINICUS.BI.signalPrioritizer =
    Object.freeze({
      SEVERITY_WEIGHT,
      prioritize,
      score
    });
})(window);
