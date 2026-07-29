(function (global) {
  "use strict";

  function createAudience(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (!input.twinId || !input.name) {
      return runtime.failure(
        "AUDIENCE_INVALID",
        "twinId and name are required."
      );
    }

    return runtime.success({
      audienceId:
        input.audienceId ||
        runtime.createId("dt_audience"),
      twinId:
        String(input.twinId),
      name:
        String(input.name),
      customerSegmentIds:
        Array.isArray(input.customerSegmentIds)
          ? input.customerSegmentIds.map(String)
          : [],
      criteria:
        runtime.clone(input.criteria || {}),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  function createCampaign(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.name ||
      !input.marketingChannelId
    ) {
      return runtime.failure(
        "CAMPAIGN_INVALID",
        "twinId, name, and marketingChannelId are required."
      );
    }

    return runtime.success({
      campaignId:
        input.campaignId ||
        runtime.createId("dt_campaign"),
      twinId:
        String(input.twinId),
      name:
        String(input.name),
      marketingChannelId:
        String(input.marketingChannelId),
      audienceIds:
        Array.isArray(input.audienceIds)
          ? input.audienceIds.map(String)
          : [],
      objective:
        String(input.objective || "conversion"),
      startAt:
        input.startAt || null,
      endAt:
        input.endAt || null,
      attributionModel:
        String(input.attributionModel || "last_touch"),
      budget:
        Number(input.budget || 0),
      currency:
        String(input.currency || "USD").toUpperCase(),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.audienceCampaignModel =
    Object.freeze({
      createAudience,
      createCampaign
    });
})(window);
