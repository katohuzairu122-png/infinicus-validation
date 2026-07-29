(function (global) {
  "use strict";

  function createRole(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (!input.twinId || !input.name) {
      return runtime.failure(
        "ROLE_INVALID",
        "twinId and name are required."
      );
    }

    return runtime.success({
      roleId:
        input.roleId ||
        runtime.createId("dt_role"),
      twinId:
        String(input.twinId),
      name:
        String(input.name),
      code:
        String(input.code || "")
          .trim()
          .toUpperCase(),
      responsibilities:
        runtime.clone(input.responsibilities || []),
      authorityLevel:
        String(input.authorityLevel || "operational"),
      requiredCapabilities:
        runtime.clone(input.requiredCapabilities || []),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  function createPosition(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.roleId ||
      !input.organizationUnitId
    ) {
      return runtime.failure(
        "POSITION_INVALID",
        "twinId, roleId, and organizationUnitId are required."
      );
    }

    return runtime.success({
      positionId:
        input.positionId ||
        runtime.createId("dt_position"),
      twinId:
        String(input.twinId),
      roleId:
        String(input.roleId),
      organizationUnitId:
        String(input.organizationUnitId),
      reportsToPositionId:
        input.reportsToPositionId || null,
      occupantEntityInstanceId:
        input.occupantEntityInstanceId || null,
      allocationPercent:
        Number(input.allocationPercent ?? 100),
      status:
        String(
          input.status ||
          (
            input.occupantEntityInstanceId
              ? "filled"
              : "vacant"
          )
        ),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.rolePositionModel =
    Object.freeze({
      createRole,
      createPosition
    });
})(window);
