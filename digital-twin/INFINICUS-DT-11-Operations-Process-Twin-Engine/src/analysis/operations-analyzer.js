(function (global) {
  "use strict";

  function analyze({ stages = [], resources = [], workItems = [] } = {}) {
    const completed = workItems.filter(item => item.completedAt);
    const queue = workItems.filter(item => !item.completedAt && item.status !== "cancelled");

    const cycleTimes = completed.map(item =>
      (new Date(item.completedAt).getTime() - new Date(item.enteredAt).getTime()) / 60000
    ).filter(Number.isFinite);

    const throughput = completed.length;
    const averageCycleTimeMinutes = cycleTimes.length
      ? Number((cycleTimes.reduce((a,b) => a+b, 0) / cycleTimes.length).toFixed(4))
      : null;

    const totalCapacity = resources.reduce((sum, item) =>
      sum + Number(item.capacity || 0) * Number(item.availabilityPercent || 0) / 100, 0);

    const utilizationPercent = totalCapacity === 0
      ? null
      : Number((throughput / totalCapacity * 100).toFixed(4));

    const defectRatePercent = workItems.length === 0
      ? null
      : Number((workItems.filter(item => item.defect).length / workItems.length * 100).toFixed(4));

    const reworkRatePercent = workItems.length === 0
      ? null
      : Number((workItems.filter(item => item.rework).length / workItems.length * 100).toFixed(4));

    const slaKnown = workItems.filter(item => item.slaMet != null);
    const slaCompliancePercent = slaKnown.length === 0
      ? null
      : Number((slaKnown.filter(item => item.slaMet).length / slaKnown.length * 100).toFixed(4));

    const queueByStage = new Map();
    for (const item of queue) {
      queueByStage.set(item.processStageId, (queueByStage.get(item.processStageId) || 0) + 1);
    }

    const bottlenecks = [...queueByStage.entries()]
      .map(([processStageId, queueLength]) => ({ processStageId, queueLength }))
      .sort((a,b) => b.queueLength - a.queueLength);

    return {
      throughput,
      queueLength: queue.length,
      averageCycleTimeMinutes,
      totalEffectiveCapacity: Number(totalCapacity.toFixed(4)),
      utilizationPercent,
      defectRatePercent,
      reworkRatePercent,
      slaCompliancePercent,
      bottlenecks,
      stageCount: stages.length,
      resourceCount: resources.length
    };
  }

  global.INFINICUS.DT.operationsAnalyzer = Object.freeze({ analyze });
})(window);
