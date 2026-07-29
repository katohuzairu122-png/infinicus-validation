(function (global) {
  "use strict";

  function calculate(actual, reference, direction = "higher_is_better") {
    const a = Number(actual);
    const r = Number(reference);

    if (!Number.isFinite(a) || !Number.isFinite(r)) {
      return {
        valid: false,
        absoluteVariance: null,
        variancePercent: null,
        favorable: null,
        severity: "unknown"
      };
    }

    const absoluteVariance = a - r;
    const variancePercent = r === 0
      ? null
      : absoluteVariance / Math.abs(r) * 100;

    const favorable =
      direction === "lower_is_better"
        ? absoluteVariance <= 0
        : absoluteVariance >= 0;

    const magnitude =
      variancePercent == null
        ? Math.abs(absoluteVariance)
        : Math.abs(variancePercent);

    return {
      valid: true,
      absoluteVariance:
        Number(absoluteVariance.toFixed(4)),
      variancePercent:
        variancePercent == null
          ? null
          : Number(variancePercent.toFixed(4)),
      favorable,
      severity:
        magnitude >= 25 ? "critical" :
        magnitude >= 10 ? "high" :
        magnitude >= 5 ? "moderate" :
        "low"
    };
  }

  global.INFINICUS.BI.varianceEngine =
    Object.freeze({ calculate });
})(window);
