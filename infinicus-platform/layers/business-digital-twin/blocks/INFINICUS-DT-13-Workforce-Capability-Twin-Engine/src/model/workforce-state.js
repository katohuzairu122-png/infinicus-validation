(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.workforceMemberId ||
      !input.period
    ) {
      return runtime.failure(
        "WORKFORCE_STATE_INVALID",
        "twinId, workforceMemberId, and period are required."
      );
    }

    return runtime.success({
      workforceStateId:
        input.workforceStateId ||
        runtime.createId("dt_workforce_state"),
      twinId:
        String(input.twinId),
      workforceMemberId:
        String(input.workforceMemberId),
      period:
        String(input.period),
      availableHours:
        Number(input.availableHours || 0),
      assignedHours:
        Number(input.assignedHours || 0),
      productiveHours:
        Number(input.productiveHours || 0),
      absenceHours:
        Number(input.absenceHours || 0),
      overtimeHours:
        Number(input.overtimeHours || 0),
      trainingHours:
        Number(input.trainingHours || 0),
      workloadScore:
        Number(input.workloadScore || 0),
      engagementScore:
        input.engagementScore == null
          ? null
          : Number(input.engagementScore),
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

  global.INFINICUS.DT.workforceStateModel =
    Object.freeze({ create });
})(window);
