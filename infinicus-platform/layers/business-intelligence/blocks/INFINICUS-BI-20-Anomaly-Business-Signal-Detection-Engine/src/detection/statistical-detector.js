(function (global) {
  "use strict";

  function mean(values) {
    return values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  }

  function standardDeviation(values) {
    if (values.length < 2) return 0;

    const avg = mean(values);
    const variance =
      values.reduce(
        (sum, value) =>
          sum + Math.pow(value - avg, 2),
        0
      ) / values.length;

    return Math.sqrt(variance);
  }

  function zScore(value, baseline = []) {
    const values =
      baseline.map(Number).filter(Number.isFinite);

    if (!values.length) {
      return {
        valid: false,
        score: null,
        mean: null,
        standardDeviation: null
      };
    }

    const avg = mean(values);
    const deviation = standardDeviation(values);

    return {
      valid: deviation > 0,
      score:
        deviation > 0
          ? Number(((Number(value) - avg) / deviation).toFixed(4))
          : 0,
      mean:
        Number(avg.toFixed(4)),
      standardDeviation:
        Number(deviation.toFixed(4))
    };
  }

  global.INFINICUS.BI.statisticalAnomalyDetector =
    Object.freeze({
      mean,
      standardDeviation,
      zScore
    });
})(window);
