(function (global) {
  "use strict";

  const UNIT_TYPES = Object.freeze([
    "company",
    "subsidiary",
    "division",
    "department",
    "team",
    "branch",
    "project",
    "committee"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.name ||
      !UNIT_TYPES.includes(input.unitType)
    ) {
      return runtime.failure(
        "ORGANIZATION_UNIT_INVALID",
        "twinId, name, and a supported unitType are required."
      );
    }

    return runtime.success({
      organizationUnitId:
        input.organizationUnitId ||
        runtime.createId("dt_org_unit"),
      twinId:
        String(input.twinId),
      sourceEntityInstanceId:
        input.sourceEntityInstanceId || null,
      name:
        String(input.name),
      code:
        String(input.code || "")
          .trim()
          .toUpperCase(),
      unitType:
        input.unitType,
      parentOrganizationUnitId:
        input.parentOrganizationUnitId || null,
      leaderPositionId:
        input.leaderPositionId || null,
      responsibilities:
        runtime.clone(input.responsibilities || []),
      decisionRights:
        runtime.clone(input.decisionRights || []),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.organizationUnitModel =
    Object.freeze({
      UNIT_TYPES,
      create
    });
})(window);
