(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.name ||
      !input.code
    ) {
      return runtime.failure(
        "CUSTOMER_SEGMENT_INVALID",
        "twinId, name, and code are required."
      );
    }

    return runtime.success({
      customerSegmentId:
        input.customerSegmentId ||
        runtime.createId("dt_customer_segment"),
      twinId:
        String(input.twinId),
      name:
        String(input.name),
      code:
        String(input.code)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_"),
      criteria:
        runtime.clone(input.criteria || {}),
      description:
        String(input.description || ""),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.customerSegmentModel =
    Object.freeze({ create });
})(window);
