(function (global) {
  "use strict";

  function mergeRecords(records = [], mergePlans = []) {
    const byId = new Map(
      records.map(item => [item.cleanedRecordId, structuredClone(item)])
    );

    const consumed = new Set();

    for (const plan of mergePlans) {
      const canonical = byId.get(plan.canonicalRecordId);
      if (!canonical) continue;

      for (const sourceId of plan.sourceRecordIds || []) {
        if (sourceId === plan.canonicalRecordId) continue;
        const source = byId.get(sourceId);
        if (!source) continue;

        for (const [key, value] of Object.entries(source.record || {})) {
          if (
            canonical.record[key] == null ||
            canonical.record[key] === ""
          ) {
            canonical.record[key] = value;
          }
        }

        consumed.add(sourceId);
      }
    }

    return [...byId.values()]
      .filter(item => !consumed.has(item.cleanedRecordId));
  }

  global.INFINICUS.BI.mergePlanApplier =
    Object.freeze({ mergeRecords });
})(window);
