(function (global) {
  "use strict";

  const FORCE_TYPES = Object.freeze([
    "economic",
    "regulatory",
    "technology",
    "social",
    "environmental",
    "political",
    "legal",
    "competitive"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.name ||
      !FORCE_TYPES.includes(input.forceType)
    ) {
      return runtime.failure(
        "EXTERNAL_FORCE_INVALID",
        "twinId, name, and supported forceType are required."
      );
    }

    return runtime.success({
      externalForceId:
        input.externalForceId ||
        runtime.createId("dt_external_force"),
      twinId:
        String(input.twinId),
      name:
        String(input.name),
      forceType:
        input.forceType,
      marketId:
        input.marketId || null,
      impactDirection:
        String(input.impactDirection || "neutral"),
      impactScore:
        Number(input.impactScore || 0),
      probability:
        Number(input.probability ?? 0.5),
      effectiveFrom:
        input.effectiveFrom || null,
      effectiveTo:
        input.effectiveTo || null,
      sourceType:
        String(input.sourceType || "observed"),
      sourceReferences:
        runtime.clone(input.sourceReferences || []),
      lineage:
        runtime.clone(input.lineage || []),
      confidence:
        Number(input.confidence ?? 0.5),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.externalForceModel =
    Object.freeze({
      FORCE_TYPES,
      create
    });
})(window);
