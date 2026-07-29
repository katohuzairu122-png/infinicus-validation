(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.name ||
      !input.code
    ) {
      return runtime.failure(
        "STRATEGIC_CAPABILITY_INVALID",
        "twinId, name, and code are required."
      );
    }

    return runtime.success({
      strategicCapabilityId:
        input.strategicCapabilityId ||
        runtime.createId(
          "dt_strategic_capability"
        ),
      twinId:
        String(input.twinId),
      name:
        String(input.name),
      code:
        String(input.code)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_"),
      domain:
        String(input.domain || "general"),
      currentStrengthScore:
        Number(input.currentStrengthScore || 0),
      targetStrengthScore:
        Number(input.targetStrengthScore || 0),
      sourceType:
        String(input.sourceType || "observed"),
      evidence:
        runtime.clone(input.evidence || []),
      lineage:
        runtime.clone(input.lineage || []),
      confidence:
        Number(input.confidence ?? 1),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.strategicCapabilityModel =
    Object.freeze({ create });
})(window);
