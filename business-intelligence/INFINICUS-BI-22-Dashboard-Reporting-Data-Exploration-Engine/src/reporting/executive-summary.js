(function (global) {
  "use strict";

  function build(context = {}) {
    const signals =
      context.signal
        ? [context.signal]
        : context.signals || [];

    const topDrivers =
      (context.rankedDrivers || [])
        .slice(0, 3)
        .map(driver => ({
          name: driver.name,
          confidence: driver.confidence
        }));

    return {
      headline:
        context.headline ||
        signals[0]?.code ||
        "Business intelligence summary",
      status:
        signals[0]?.severity || "information",
      keyFindings: [
        ...signals.slice(0, 3).map(signal => ({
          type: "signal",
          text:
            `${signal.code}: ${signal.severity}`
        })),
        ...topDrivers.map(driver => ({
          type: "driver",
          text:
            `${driver.name} (${Math.round(driver.confidence * 100)}% confidence)`
        }))
      ],
      unresolvedCount:
        context.unresolvedHypotheses?.length || 0,
      generatedAt:
        new Date().toISOString()
    };
  }

  global.INFINICUS.BI.executiveSummaryBuilder =
    Object.freeze({ build });
})(window);
