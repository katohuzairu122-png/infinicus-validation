(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (!input.twinId || !input.marketId || !input.period) {
      return runtime.failure(
        "MARKET_STATE_INVALID",
        "twinId, marketId, and period are required."
      );
    }

    return runtime.success({
      marketStateId:
        input.marketStateId ||
        runtime.createId("dt_market_state"),
      twinId:
        String(input.twinId),
      marketId:
        String(input.marketId),
      marketSegmentId:
        input.marketSegmentId || null,
      period:
        String(input.period),
      ownMarketSharePercent:
        Number(input.ownMarketSharePercent || 0),
      demandIndex:
        Number(input.demandIndex || 100),
      ownPriceIndex:
        Number(input.ownPriceIndex || 100),
      competitiveIntensityScore:
        Number(input.competitiveIntensityScore || 0),
      regulatoryPressureScore:
        Number(input.regulatoryPressureScore || 0),
      externalRiskScore:
        Number(input.externalRiskScore || 0),
      differentiationScore:
        Number(input.differentiationScore || 0),
      sourceType:
        String(input.sourceType || "observed"),
      lineage:
        runtime.clone(input.lineage || []),
      confidence:
        Number(input.confidence ?? 1),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.marketStateModel =
    Object.freeze({ create });
})(window);
