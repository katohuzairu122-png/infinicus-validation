(function (global) {
  "use strict";

  const CHANNEL_TYPES = Object.freeze([
    "paid_search",
    "paid_social",
    "organic_search",
    "organic_social",
    "email",
    "referral",
    "affiliate",
    "direct",
    "offline",
    "marketplace",
    "other"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.name ||
      !CHANNEL_TYPES.includes(input.channelType)
    ) {
      return runtime.failure(
        "MARKETING_CHANNEL_INVALID",
        "twinId, name, and supported channelType are required."
      );
    }

    return runtime.success({
      marketingChannelId:
        input.marketingChannelId ||
        runtime.createId("dt_marketing_channel"),
      twinId:
        String(input.twinId),
      name:
        String(input.name),
      channelType:
        input.channelType,
      platform:
        String(input.platform || ""),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.marketingChannelModel =
    Object.freeze({
      CHANNEL_TYPES,
      create
    });
})(window);
