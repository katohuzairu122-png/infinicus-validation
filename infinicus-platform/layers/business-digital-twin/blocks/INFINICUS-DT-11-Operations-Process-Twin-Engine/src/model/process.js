(function (global) {
  "use strict";

  function createProcess(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;
    if (!input.twinId || !input.name || !input.code) {
      return runtime.failure("PROCESS_INVALID", "twinId, name, and code are required.");
    }

    return runtime.success({
      processId: input.processId || runtime.createId("dt_process"),
      twinId: String(input.twinId),
      name: String(input.name),
      code: String(input.code).trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      organizationUnitId: input.organizationUnitId || null,
      ownerPositionId: input.ownerPositionId || null,
      objectives: runtime.clone(input.objectives || []),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  function createStage(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;
    if (!input.twinId || !input.processId || !input.name) {
      return runtime.failure("PROCESS_STAGE_INVALID", "twinId, processId, and name are required.");
    }

    return runtime.success({
      processStageId: input.processStageId || runtime.createId("dt_process_stage"),
      twinId: String(input.twinId),
      processId: String(input.processId),
      name: String(input.name),
      order: Math.max(1, Number(input.order || 1)),
      predecessorStageIds: Array.isArray(input.predecessorStageIds) ? input.predecessorStageIds.map(String) : [],
      capacityPerPeriod: Number(input.capacityPerPeriod || 0),
      targetCycleTimeMinutes: Number(input.targetCycleTimeMinutes || 0),
      targetSlaPercent: Number(input.targetSlaPercent || 0),
      status: String(input.status || "active"),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.DT.processModel = Object.freeze({ createProcess, createStage });
})(window);
