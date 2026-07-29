(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.name ||
      !input.competitorKey
    ) {
      return runtime.failure(
        "COMPETITOR_INVALID",
        "twinId, name, and competitorKey are required."
      );
    }

    return runtime.success({
      competitorId:
        input.competitorId ||
        runtime.createId("dt_competitor"),
      twinId:
        String(input.twinId),
      competitorKey:
        String(input.competitorKey),
      name:
        String(input.name),
      marketIds:
        Array.isArray(input.marketIds)
          ? input.marketIds.map(String)
          : [],
      marketSegmentIds:
        Array.isArray(input.marketSegmentIds)
          ? input.marketSegmentIds.map(String)
          : [],
      marketSharePercent:
        input.marketSharePercent == null
          ? null
          : Number(input.marketSharePercent),
      averagePriceIndex:
        input.averagePriceIndex == null
          ? null
          : Number(input.averagePriceIndex),
      differentiationScore:
        input.differentiationScore == null
          ? null
          : Number(input.differentiationScore),
      threatScore:
        input.threatScore == null
          ? null
          : Number(input.threatScore),
      sourceType:
        String(input.sourceType || "observed"),
      sourceReferences:
        runtime.clone(input.sourceReferences || []),
      lineage:
        runtime.clone(input.lineage || []),
      confidence:
        Number(input.confidence ?? 0.5),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.competitorModel =
    Object.freeze({ create });
})(window);
