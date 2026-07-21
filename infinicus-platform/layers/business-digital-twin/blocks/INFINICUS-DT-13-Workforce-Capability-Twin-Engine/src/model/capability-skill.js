(function (global) {
  "use strict";

  function createSkill(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (!input.twinId || !input.name || !input.code) {
      return runtime.failure(
        "SKILL_INVALID",
        "twinId, name, and code are required."
      );
    }

    return runtime.success({
      skillId:
        input.skillId ||
        runtime.createId("dt_skill"),
      twinId:
        String(input.twinId),
      name:
        String(input.name),
      code:
        String(input.code)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_"),
      category:
        String(input.category || "general"),
      levels:
        runtime.clone(
          input.levels || [
            "basic",
            "intermediate",
            "advanced",
            "expert"
          ]
        ),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  function createCapability(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.twinId ||
      !input.workforceMemberId ||
      !input.skillId
    ) {
      return runtime.failure(
        "CAPABILITY_INVALID",
        "twinId, workforceMemberId, and skillId are required."
      );
    }

    return runtime.success({
      capabilityId:
        input.capabilityId ||
        runtime.createId("dt_capability"),
      twinId:
        String(input.twinId),
      workforceMemberId:
        String(input.workforceMemberId),
      skillId:
        String(input.skillId),
      level:
        String(input.level || "basic"),
      proficiencyScore:
        Number(input.proficiencyScore || 0),
      verified:
        Boolean(input.verified),
      sourceType:
        String(input.sourceType || "observed"),
      lineage:
        runtime.clone(input.lineage || []),
      confidence:
        Number(input.confidence ?? 1),
      updatedAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.capabilitySkillModel =
    Object.freeze({
      createSkill,
      createCapability
    });
})(window);
