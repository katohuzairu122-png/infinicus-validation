(function (global) {
  "use strict";

  function createOrder(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.orderKey ||
      !input.orderedAt
    ) {
      return runtime.failure(
        "ORDER_INVALID",
        "twinId, orderKey, and orderedAt are required."
      );
    }

    return runtime.success({
      orderId:
        input.orderId ||
        runtime.createId("dt_order"),
      twinId:
        String(input.twinId),
      orderKey:
        String(input.orderKey),
      customerProfileId:
        input.customerProfileId || null,
      opportunityId:
        input.opportunityId || null,
      channelId:
        input.channelId || null,
      orderedAt:
        String(input.orderedAt),
      fulfilledAt:
        input.fulfilledAt || null,
      value:
        Number(input.value || 0),
      currency:
        String(input.currency || "USD").toUpperCase(),
      recurring:
        Boolean(input.recurring),
      recurringPeriod:
        input.recurringPeriod || null,
      status:
        String(input.status || "confirmed"),
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

  function createRevenueStream(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.name ||
      !input.code
    ) {
      return runtime.failure(
        "REVENUE_STREAM_INVALID",
        "twinId, name, and code are required."
      );
    }

    return runtime.success({
      revenueStreamId:
        input.revenueStreamId ||
        runtime.createId("dt_revenue_stream"),
      twinId:
        String(input.twinId),
      name:
        String(input.name),
      code:
        String(input.code)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_"),
      recurring:
        Boolean(input.recurring),
      channelIds:
        Array.isArray(input.channelIds)
          ? input.channelIds.map(String)
          : [],
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.orderRevenueModel =
    Object.freeze({
      createOrder,
      createRevenueStream
    });
})(window);
