(function (global) {
  "use strict";

  function partitionKey(record, fields = []) {
    if (!fields.length) return "__unpartitioned__";

    return fields
      .map(field => String(record[field] ?? "unknown"))
      .join("|");
  }

  function plan({
    dataset,
    records = []
  }) {
    const partitions = new Map();

    for (const record of records) {
      const key =
        partitionKey(
          record,
          dataset.partitionFields
        );

      if (!partitions.has(key)) {
        partitions.set(key, []);
      }

      partitions.get(key).push(record);
    }

    return {
      loadMode:
        dataset.loadMode,
      partitions:
        [...partitions.entries()]
          .map(([key, rows]) => ({
            partitionKey: key,
            rows
          }))
    };
  }

  global.INFINICUS.BI.warehouseLoadPlanner =
    Object.freeze({
      partitionKey,
      plan
    });
})(window);
