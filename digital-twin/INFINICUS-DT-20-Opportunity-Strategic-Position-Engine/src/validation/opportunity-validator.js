(function (global) {
  "use strict";

  function validate({
    opportunities = [],
    capabilities = [],
    synchronizedState = []
  } = {}) {
    const issues = [];

    const capabilityIds =
      new Set(
        capabilities.map(
          item =>
            item.strategicCapabilityId
        )
      );

    const stateKeys =
      new Set(
        synchronizedState.map(
          item =>
            item.stateKey
        )
      );

    for (
      const opportunity
      of opportunities
    ) {
      for (
        const capabilityId
        of opportunity
          .requiredCapabilityIds
      ) {
        if (
          !capabilityIds.has(
            capabilityId
          )
        ) {
          issues.push(
            `Unknown required capability: ${capabilityId}`
          );
        }
      }

      for (
        const stateKey
        of opportunity
          .dependencyStateKeys
      ) {
        if (!stateKeys.has(stateKey)) {
          issues.push(
            `Unknown opportunity dependency state: ${stateKey}`
          );
        }
      }

      for (const field of [
        "expectedValueScore",
        "readinessScore",
        "feasibilityScore",
        "strategicFitScore",
        "effortScore",
        "riskScore"
      ]) {
        if (
          opportunity[field] < 0 ||
          opportunity[field] > 100
        ) {
          issues.push(
            `${field} must be between 0 and 100.`
          );
        }
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

    return {
      valid:
        issues.length === 0,
      issues
    };
  }

  global.INFINICUS.DT
    .opportunityValidator =
      Object.freeze({ validate });
})(window);
