(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.opportunityKey ||
      !input.pipelineStageId
    ) {
      return runtime.failure(
        "OPPORTUNITY_INVALID",
        "twinId, opportunityKey, and pipelineStageId are required."
      );
    }

    return runtime.success({
      opportunityId:
        input.opportunityId ||
        runtime.createId("dt_opportunity"),
      twinId: String(input.twinId),
      opportunityKey:
        String(input.opportunityKey),
      customerProfileId:
        input.customerProfileId || null,
      pipelineStageId:
        String(input.pipelineStageId),
      channelId:
        input.channelId || null,
      expectedValue:
        Number(input.expectedValue || 0),
      currency:
        String(input.currency || "USD").toUpperCase(),
      openedAt:
        input.openedAt || new Date().toISOString(),
      expectedCloseAt:
        input.expectedCloseAt || null,
      closedAt:
        input.closedAt || null,
      status:
        String(input.status || "open"),
      sourceType:
        String(input.sourceType || "observed"),
      sourceReferences:
        runtime.clone(input.sourceReferences || []),
      lineage:
        runtime.clone(input.lineage || []),
      confidence:
        Number(input.confidence ?? 1),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.opportunityModel =
    Object.freeze({ create });
})(window);
