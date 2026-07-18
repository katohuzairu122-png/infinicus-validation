(function (global) {
  "use strict";

  function timeBucket(value, grain) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "unknown";
    }

    const year =
      date.getUTCFullYear();

    const month =
      String(date.getUTCMonth() + 1)
        .padStart(2, "0");

    const day =
      String(date.getUTCDate())
        .padStart(2, "0");

    if (grain === "year") return `${year}`;
    if (grain === "month") return `${year}-${month}`;
    if (grain === "day") return `${year}-${month}-${day}`;

    return "all_time";
  }

  function group(records, metric) {
    const groups = new Map();

    for (const record of records) {
      const parts = [];

      for (const dimension of metric.dimensions || []) {
        parts.push(
          `${dimension}:${record[dimension] ?? "unknown"}`
        );
      }

      if (
        metric.timeGrain &&
        metric.timeGrain !== "all_time"
      ) {
        const timeField =
          metric.formula?.timeField ||
          "date";

        parts.push(
          `time:${timeBucket(
            record[timeField],
            metric.timeGrain
          )}`
        );
      }

      const key =
        parts.length
          ? parts.join("|")
          : "__all__";

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(record);
    }

    return groups;
  }

  global.INFINICUS.BI.metricGroupingEngine =
    Object.freeze({
      timeBucket,
      group
    });
})(window);
