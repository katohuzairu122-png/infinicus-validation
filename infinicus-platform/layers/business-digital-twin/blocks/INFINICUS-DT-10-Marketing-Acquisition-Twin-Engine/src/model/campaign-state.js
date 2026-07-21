(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.campaignId ||
      !input.period
    ) {
      return runtime.failure(
        "CAMPAIGN_STATE_INVALID",
        "twinId, campaignId, and period are required."
      );
    }

    return runtime.success({
      campaignStateId:
        input.campaignStateId ||
        runtime.createId("dt_campaign_state"),
      twinId:
        String(input.twinId),
      campaignId:
        String(input.campaignId),
      period:
        String(input.period),
      spend:
        Number(input.spend || 0),
      reach:
        Number(input.reach || 0),
      impressions:
        Number(input.impressions || 0),
      engagements:
        Number(input.engagements || 0),
      leads:
        Number(input.leads || 0),
      conversions:
        Number(input.conversions || 0),
      attributedRevenue:
        Number(input.attributedRevenue || 0),
      acquiredCustomers:
        Number(input.acquiredCustomers || 0),
      sourceType:
        String(input.sourceType || "observed"),
      sourceReferences:
        runtime.clone(input.sourceReferences || []),
      lineage:
        runtime.clone(input.lineage || []),
      confidence:
        Number(input.confidence ?? 1),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.campaignStateModel =
    Object.freeze({ create });
})(window);
