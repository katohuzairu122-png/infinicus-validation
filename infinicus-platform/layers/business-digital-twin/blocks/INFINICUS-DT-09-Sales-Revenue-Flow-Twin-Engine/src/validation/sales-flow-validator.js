(function (global) {
  "use strict";

  function validate({
    stages = [],
    opportunities = [],
    orders = [],
    customerProfiles = []
  } = {}) {
    const issues = [];
    const stageIds =
      new Set(stages.map(item => item.pipelineStageId));
    const opportunityIds =
      new Set(opportunities.map(item => item.opportunityId));
    const customerIds =
      new Set(customerProfiles.map(item => item.customerProfileId));

    for (const opportunity of opportunities) {
      if (!stageIds.has(opportunity.pipelineStageId)) {
        issues.push(
          `Unknown pipeline stage: ${opportunity.pipelineStageId}`
        );
      }

      if (
        opportunity.customerProfileId &&
        !customerIds.has(opportunity.customerProfileId)
      ) {
        issues.push(
          `Unknown customer profile: ${opportunity.customerProfileId}`
        );
      }

      if (
        opportunity.confidence < 0 ||
        opportunity.confidence > 1
      ) {
        issues.push(
          "Opportunity confidence must be between 0 and 1."
        );
      }
    }

    for (const order of orders) {
      if (
        order.opportunityId &&
        !opportunityIds.has(order.opportunityId)
      ) {
        issues.push(
          `Unknown opportunity: ${order.opportunityId}`
        );
      }

      if (
        order.customerProfileId &&
        !customerIds.has(order.customerProfileId)
      ) {
        issues.push(
          `Unknown customer profile: ${order.customerProfileId}`
        );
      }
    }

    return {
      valid:
        issues.length === 0,
      issues
    };
  }

  global.INFINICUS.DT.salesFlowValidator =
    Object.freeze({ validate });
})(window);
