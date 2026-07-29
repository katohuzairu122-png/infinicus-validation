(function (global) {
  "use strict";

  function analyze(series = []) {
    const ordered = [...series]
      .filter(point => Number.isFinite(Number(point.value)))
      .sort((a, b) =>
        new Date(a.period).getTime() -
        new Date(b.period).getTime()
      );

    if (ordered.length < 2) {
      return {
        direction: "insufficient_data",
        change: null,
        changePercent: null,
        momentum: "unknown",
        points: ordered
      };
    }

    const first = Number(ordered[0].value);
    const last = Number(ordered.at(-1).value);
    const previous = Number(ordered.at(-2).value);
    const change = last - first;
    const changePercent = first === 0
      ? null
      : change / Math.abs(first) * 100;

    const recentChange = last - previous;

    return {
      direction:
        change > 0 ? "upward" :
        change < 0 ? "downward" :
        "flat",
      change:
        Number(change.toFixed(4)),
      changePercent:
        changePercent == null
          ? null
          : Number(changePercent.toFixed(4)),
      momentum:
        Math.abs(recentChange) > Math.abs(change) / Math.max(1, ordered.length - 1)
          ? "accelerating"
          : "stable",
      points: ordered
    };
  }

  global.INFINICUS.BI.trendEngine =
    Object.freeze({ analyze });
})(window);
