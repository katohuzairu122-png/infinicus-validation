(function (global) {
  "use strict";

  function normalizeKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (!input.legalName || !input.businessKey) {
      return runtime.failure(
        "BUSINESS_IDENTITY_INVALID",
        "legalName and businessKey are required."
      );
    }

    const businessKey = normalizeKey(input.businessKey);

    if (!businessKey) {
      return runtime.failure(
        "BUSINESS_KEY_INVALID",
        "businessKey could not be normalized."
      );
    }

    return runtime.success({
      businessId:
        input.businessId ||
        runtime.createId("dt_business"),
      businessKey,
      legalName:
        String(input.legalName),
      tradingName:
        String(input.tradingName || input.legalName),
      registrationNumber:
        input.registrationNumber || null,
      countryCode:
        String(input.countryCode || ""),
      industry:
        String(input.industry || ""),
      ownerId:
        String(input.ownerId || ""),
      tenantId:
        String(input.tenantId || ""),
      metadata:
        runtime.clone(input.metadata || {}),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.businessIdentityModel =
    Object.freeze({
      normalizeKey,
      create
    });
})(window);
