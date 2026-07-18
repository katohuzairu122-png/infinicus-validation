(function (global) {
  "use strict";

  const ASSET_TYPES = Object.freeze([
    "equipment",
    "vehicle",
    "facility_system",
    "device",
    "software",
    "service",
    "network",
    "database",
    "intellectual_property",
    "other"
  ]);

  function create(input = {}) {
    const runtime =
      global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.name ||
      !input.assetKey ||
      !ASSET_TYPES.includes(input.assetType)
    ) {
      return runtime.failure(
        "ASSET_INVALID",
        "twinId, name, assetKey, and supported assetType are required."
      );
    }

    return runtime.success({
      assetId:
        input.assetId ||
        runtime.createId("dt_asset"),
      twinId:
        String(input.twinId),
      assetKey:
        String(input.assetKey),
      name:
        String(input.name),
      assetType:
        input.assetType,
      facilityId:
        input.facilityId || null,
      organizationUnitId:
        input.organizationUnitId || null,
      assignedWorkforceMemberId:
        input.assignedWorkforceMemberId || null,
      criticality:
        String(input.criticality || "medium"),
      capacity:
        Number(input.capacity || 0),
      acquisitionValue:
        Number(input.acquisitionValue || 0),
      currency:
        String(input.currency || "USD").toUpperCase(),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.assetModel =
    Object.freeze({
      ASSET_TYPES,
      create
    });
})(window);
