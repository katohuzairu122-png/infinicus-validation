(function (global) {
  "use strict";

  function createResource(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;
    if (!input.twinId || !input.name || !input.resourceType) {
      return runtime.failure("RESOURCE_INVALID", "twinId, name, and resourceType are required.");
    }

    return runtime.success({
      resourceId: input.resourceId || runtime.createId("dt_resource"),
      twinId: String(input.twinId),
      name: String(input.name),
      resourceType: String(input.resourceType),
      processStageIds: Array.isArray(input.processStageIds) ? input.processStageIds.map(String) : [],
      capacity: Number(input.capacity || 0),
      availabilityPercent: Number(input.availabilityPercent ?? 100),
      status: String(input.status || "available"),
      createdAt: new Date().toISOString()
    });
  }

  function createWorkItem(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;
    if (!input.twinId || !input.processId || !input.processStageId || !input.workItemKey) {
      return runtime.failure("WORK_ITEM_INVALID", "twinId, processId, processStageId, and workItemKey are required.");
    }

    return runtime.success({
      workItemId: input.workItemId || runtime.createId("dt_work_item"),
      twinId: String(input.twinId),
      workItemKey: String(input.workItemKey),
      processId: String(input.processId),
      processStageId: String(input.processStageId),
      enteredAt: input.enteredAt || new Date().toISOString(),
      completedAt: input.completedAt || null,
      status: String(input.status || "queued"),
      priority: String(input.priority || "normal"),
      defect: Boolean(input.defect),
      rework: Boolean(input.rework),
      slaMet: input.slaMet == null ? null : Boolean(input.slaMet),
      sourceType: String(input.sourceType || "observed"),
      lineage: runtime.clone(input.lineage || []),
      confidence: Number(input.confidence ?? 1),
      createdAt: new Date().toISOString()
    });
  }

  global.INFINICUS.DT.resourceWorkItemModel = Object.freeze({
    createResource,
    createWorkItem
  });
})(window);
