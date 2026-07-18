(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.period
    ) {
      return runtime.failure(
        "DEMAND_STATE_INVALID",
        "twinId and period are required."
      );
    }

    return runtime.success({
      demandStateId:
        input.demandStateId ||
        runtime.createId("dt_demand_state"),
      twinId:
        String(input.twinId),
      customerProfileId:
        input.customerProfileId || null,
      customerSegmentId:
        input.customerSegmentId || null,
      cohortId:
        input.cohortId || null,
      period:
        String(input.period),
      demandUnits:
        Number(input.demandUnits || 0),
      revenueValue:
        Number(input.revenueValue || 0),
      retentionRatePercent:
        input.retentionRatePercent == null
          ? null
          : Number(input.retentionRatePercent),
      churnRatePercent:
        input.churnRatePercent == null
          ? null
          : Number(input.churnRatePercent),
      purchaseFrequency:
        input.purchaseFrequency == null
          ? null
          : Number(input.purchaseFrequency),
      lifetimeValue:
        input.lifetimeValue == null
          ? null
          : Number(input.lifetimeValue),
      satisfactionScore:
        input.satisfactionScore == null
          ? null
          : Number(input.satisfactionScore),
      advocacyScore:
        input.advocacyScore == null
          ? null
          : Number(input.advocacyScore),
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

  global.INFINICUS.DT.demandStateModel =
    Object.freeze({ create });
})(window);
