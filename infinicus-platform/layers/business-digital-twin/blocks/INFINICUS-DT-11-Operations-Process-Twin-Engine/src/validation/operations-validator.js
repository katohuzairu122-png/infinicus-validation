(function (global) {
  "use strict";

  function validate({ processes = [], stages = [], resources = [], workItems = [] } = {}) {
    const issues = [];
    const processIds = new Set(processes.map(item => item.processId));
    const stageIds = new Set(stages.map(item => item.processStageId));

    for (const stage of stages) {
      if (!processIds.has(stage.processId)) issues.push(`Unknown process: ${stage.processId}`);
      for (const predecessor of stage.predecessorStageIds) {
        if (!stageIds.has(predecessor)) issues.push(`Unknown predecessor stage: ${predecessor}`);
      }
    }

    for (const resource of resources) {
      for (const stageId of resource.processStageIds) {
        if (!stageIds.has(stageId)) issues.push(`Unknown resource stage: ${stageId}`);
      }
    }

    for (const item of workItems) {
      if (!processIds.has(item.processId)) issues.push(`Unknown work-item process: ${item.processId}`);
      if (!stageIds.has(item.processStageId)) issues.push(`Unknown work-item stage: ${item.processStageId}`);
      if (item.confidence < 0 || item.confidence > 1) issues.push("Work-item confidence must be between 0 and 1.");
    }

    return { valid: issues.length === 0, issues };
  }

  global.INFINICUS.DT.operationsValidator = Object.freeze({ validate });
})(window);
