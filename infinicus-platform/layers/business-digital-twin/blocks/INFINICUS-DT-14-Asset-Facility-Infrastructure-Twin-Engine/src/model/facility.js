(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime =
      global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.name ||
      !input.facilityType
    ) {
      return runtime.failure(
        "FACILITY_INVALID",
        "twinId, name, and facilityType are required."
      );
    }

    return runtime.success({
      facilityId:
        input.facilityId ||
        runtime.createId("dt_facility"),
      twinId:
        String(input.twinId),
      name:
        String(input.name),
      facilityType:
        String(input.facilityType),
      parentFacilityId:
        input.parentFacilityId || null,
      locationReference:
        runtime.clone(
          input.locationReference || {}
        ),
      capacity:
        Number(input.capacity || 0),
      organizationUnitId:
        input.organizationUnitId || null,
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.facilityModel =
    Object.freeze({ create });
})(window);
