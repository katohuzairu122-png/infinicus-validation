(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    return runtime.success({
      integrityPolicyId:
        input.integrityPolicyId ||
        runtime.createId("dt_integrity_policy"),
      name:
        String(input.name || "Default twin integrity policy"),
      requiredDomains:
        Array.isArray(input.requiredDomains)
          ? input.requiredDomains.map(String)
          : [
              "financial",
              "customer",
              "sales",
              "marketing",
              "operations",
              "inventory",
              "workforce",
              "asset",
              "market",
              "risk",
              "opportunity"
            ],
      minimumOverallConfidence:
        Math.max(0, Math.min(1, Number(input.minimumOverallConfidence ?? 0.65))),
      maximumStateAgeMinutes:
        Math.max(1, Number(input.maximumStateAgeMinutes || 1440)),
      maximumConflictCount:
        Math.max(0, Number(input.maximumConflictCount || 0)),
      maximumBlockingBreachCount:
        Math.max(0, Number(input.maximumBlockingBreachCount || 0)),
      maximumAssumedStatePercent:
        Math.max(0, Math.min(100, Number(input.maximumAssumedStatePercent ?? 20))),
      minimumReadinessScore:
        Math.max(0, Math.min(100, Number(input.minimumReadinessScore ?? 70))),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.integrityPolicyModel =
    Object.freeze({ create });
})(window);
