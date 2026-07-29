(function (global) {
  "use strict";

  function createMarket(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (!input.twinId || !input.name || !input.marketKey) {
      return runtime.failure(
        "MARKET_INVALID",
        "twinId, name, and marketKey are required."
      );
    }

    return runtime.success({
      marketId:
        input.marketId ||
        runtime.createId("dt_market"),
      twinId:
        String(input.twinId),
      marketKey:
        String(input.marketKey),
      name:
        String(input.name),
      geography:
        runtime.clone(input.geography || {}),
      totalAddressableMarket:
        Number(input.totalAddressableMarket || 0),
      serviceableAvailableMarket:
        Number(input.serviceableAvailableMarket || 0),
      serviceableObtainableMarket:
        Number(input.serviceableObtainableMarket || 0),
      currency:
        String(input.currency || "USD").toUpperCase(),
      growthRatePercent:
        Number(input.growthRatePercent || 0),
      sourceType:
        String(input.sourceType || "observed"),
      lineage:
        runtime.clone(input.lineage || []),
      confidence:
        Number(input.confidence ?? 1),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  function createSegment(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.marketId ||
      !input.name ||
      !input.segmentKey
    ) {
      return runtime.failure(
        "MARKET_SEGMENT_INVALID",
        "twinId, marketId, name, and segmentKey are required."
      );
    }

    return runtime.success({
      marketSegmentId:
        input.marketSegmentId ||
        runtime.createId("dt_market_segment"),
      twinId:
        String(input.twinId),
      marketId:
        String(input.marketId),
      segmentKey:
        String(input.segmentKey),
      name:
        String(input.name),
      estimatedSize:
        Number(input.estimatedSize || 0),
      growthRatePercent:
        Number(input.growthRatePercent || 0),
      attractivenessScore:
        Number(input.attractivenessScore || 0),
      sourceType:
        String(input.sourceType || "inferred"),
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

  global.INFINICUS.DT.marketSegmentModel =
    Object.freeze({
      createMarket,
      createSegment
    });
})(window);
