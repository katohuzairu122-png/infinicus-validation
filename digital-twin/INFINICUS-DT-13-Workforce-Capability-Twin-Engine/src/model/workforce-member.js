(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (!input.twinId || !input.workforceKey) {
      return runtime.failure(
        "WORKFORCE_MEMBER_INVALID",
        "twinId and workforceKey are required."
      );
    }

    return runtime.success({
      workforceMemberId:
        input.workforceMemberId ||
        runtime.createId("dt_workforce_member"),
      twinId:
        String(input.twinId),
      workforceKey:
        String(input.workforceKey),
      sourceEntityInstanceId:
        input.sourceEntityInstanceId || null,
      employmentType:
        String(input.employmentType || "employee"),
      organizationUnitId:
        input.organizationUnitId || null,
      positionId:
        input.positionId || null,
      status:
        String(input.status || "active"),
      availabilityPercent:
        Number(input.availabilityPercent ?? 100),
      attendancePercent:
        Number(input.attendancePercent ?? 100),
      productivityScore:
        Number(input.productivityScore ?? 0),
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

  global.INFINICUS.DT.workforceMemberModel =
    Object.freeze({ create });
})(window);
