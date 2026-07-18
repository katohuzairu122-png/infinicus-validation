(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.customerKey
    ) {
      return runtime.failure(
        "CUSTOMER_PROFILE_INVALID",
        "twinId and customerKey are required."
      );
    }

    return runtime.success({
      customerProfileId:
        input.customerProfileId ||
        runtime.createId("dt_customer_profile"),
      twinId:
        String(input.twinId),
      customerKey:
        String(input.customerKey),
      sourceEntityInstanceId:
        input.sourceEntityInstanceId || null,
      segmentIds:
        Array.isArray(input.segmentIds)
          ? [...new Set(input.segmentIds.map(String))]
          : [],
      cohortIds:
        Array.isArray(input.cohortIds)
          ? [...new Set(input.cohortIds.map(String))]
          : [],
      status:
        String(input.status || "active"),
      attributes:
        runtime.clone(input.attributes || {}),
      sourceType:
        String(input.sourceType || "observed"),
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

  global.INFINICUS.DT.customerProfileModel =
    Object.freeze({ create });
})(window);
