(function (global) {
  "use strict";

  const TWIN_TYPES = Object.freeze([
    "business",
    "branch",
    "department",
    "project",
    "business_unit",
    "location",
    "subsidiary"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;
    const twinType = String(input.twinType || "business");

    if (
      !input.businessId ||
      !input.name ||
      !TWIN_TYPES.includes(twinType)
    ) {
      return runtime.failure(
        "TWIN_INSTANCE_INVALID",
        "businessId, name, and a supported twinType are required."
      );
    }

    if (
      twinType !== "business" &&
      !input.parentTwinId
    ) {
      return runtime.failure(
        "PARENT_TWIN_REQUIRED",
        "Non-business twin instances require a parentTwinId."
      );
    }

    return runtime.success({
      twinId:
        input.twinId ||
        runtime.createId("dt_twin"),
      businessId:
        String(input.businessId),
      twinKey:
        global.INFINICUS.DT.businessIdentityModel
          .normalizeKey(
            input.twinKey ||
            `${input.businessId}_${input.name}`
          ),
      name:
        String(input.name),
      twinType,
      parentTwinId:
        input.parentTwinId || null,
      aliases:
        Array.isArray(input.aliases)
          ? [...new Set(input.aliases.map(String))]
          : [],
      ownerId:
        String(input.ownerId || ""),
      tenantId:
        String(input.tenantId || ""),
      lifecycleState:
        String(input.lifecycleState || "initializing"),
      lifecycleHistory: [{
        from: null,
        to:
          String(input.lifecycleState || "initializing"),
        reason:
          "Twin instance created.",
        changedAt:
          new Date().toISOString()
      }],
      metadata:
        runtime.clone(input.metadata || {}),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.twinInstanceModel =
    Object.freeze({
      TWIN_TYPES,
      create
    });
})(window);
