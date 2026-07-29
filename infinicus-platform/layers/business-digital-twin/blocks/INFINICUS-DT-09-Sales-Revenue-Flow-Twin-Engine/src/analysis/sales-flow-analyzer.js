(function (global) {
  "use strict";

  function analyze({
    stages = [],
    opportunities = [],
    orders = []
  } = {}) {
    const stageById =
      new Map(stages.map(stage => [stage.pipelineStageId, stage]));

    const openOpportunities =
      opportunities.filter(item => item.status === "open");

    const weightedPipeline =
      openOpportunities.reduce((sum, opportunity) => {
        const stage =
          stageById.get(opportunity.pipelineStageId);

        const probability =
          Number(stage?.probabilityPercent || 0) / 100;

        return sum +
          Number(opportunity.expectedValue || 0) *
          probability;
      }, 0);

    const totalPipeline =
      openOpportunities.reduce(
        (sum, opportunity) =>
          sum + Number(opportunity.expectedValue || 0),
        0
      );

    const totalRevenue =
      orders
        .filter(order =>
          !["cancelled", "refunded"].includes(order.status)
        )
        .reduce(
          (sum, order) =>
            sum + Number(order.value || 0),
          0
        );

    const recurringRevenue =
      orders
        .filter(order =>
          order.recurring &&
          !["cancelled", "refunded"].includes(order.status)
        )
        .reduce(
          (sum, order) =>
            sum + Number(order.value || 0),
          0
        );

    const won =
      opportunities.filter(item =>
        item.status === "won"
      ).length;

    const lost =
      opportunities.filter(item =>
        item.status === "lost"
      ).length;

    const conversionRatePercent =
      won + lost === 0
        ? null
        : Number(
            (won / (won + lost) * 100)
              .toFixed(4)
          );

    const closed =
      opportunities.filter(item =>
        item.closedAt && item.openedAt
      );

    const averageSalesCycleDays =
      closed.length === 0
        ? null
        : Number((
            closed.reduce((sum, item) =>
              sum +
              (
                new Date(item.closedAt).getTime() -
                new Date(item.openedAt).getTime()
              ) / 86400000,
            0) / closed.length
          ).toFixed(4));

    return {
      totalPipeline:
        Number(totalPipeline.toFixed(4)),
      weightedPipeline:
        Number(weightedPipeline.toFixed(4)),
      totalRevenue:
        Number(totalRevenue.toFixed(4)),
      recurringRevenue:
        Number(recurringRevenue.toFixed(4)),
      opportunityCount:
        opportunities.length,
      openOpportunityCount:
        openOpportunities.length,
      wonCount:
        won,
      lostCount:
        lost,
      conversionRatePercent,
      averageSalesCycleDays
    };
  }

  global.INFINICUS.DT.salesFlowAnalyzer =
    Object.freeze({ analyze });
})(window);
