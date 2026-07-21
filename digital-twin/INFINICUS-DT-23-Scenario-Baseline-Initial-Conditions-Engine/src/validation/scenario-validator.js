(function (global) {
  "use strict";

  function validate({
    scenario,
    baselineState = [],
    conditions = []
  } = {}) {
    const issues = [];
    const baselineKeys =
      new Set(
        baselineState.map(item => item.stateKey)
      );

    for (const condition of conditions) {
      if (
        !baselineKeys.has(condition.stateKey)
      ) {
        issues.push(
          `Condition references unknown baseline state: ${condition.stateKey}`
        );
      }

      if (
        condition.sourceClass === "actual"
      ) {
        issues.push(
          `Scenario condition cannot relabel actual state: ${condition.stateKey}`
        );
      }

      if (
        condition.confidence < 0 ||
        condition.confidence > 1
      ) {
        issues.push(
          "Initial-condition confidence must be between 0 and 1."
        );
      }

      if (
        ["bounded", "uniform", "triangular"]
          .includes(condition.conditionType)
      ) {
        if (
          condition.minimum == null ||
          condition.maximum == null ||
          condition.minimum > condition.maximum
        ) {
          issues.push(
            `Invalid bounds for ${condition.stateKey}`
          );
        }
      }

      if (
        condition.conditionType === "normal" &&
        (
          condition.mean == null ||
          condition.standardDeviation == null ||
          condition.standardDeviation < 0
        )
      ) {
        issues.push(
          `Invalid normal distribution for ${condition.stateKey}`
        );
      }

      if (
        condition.conditionType === "bernoulli" &&
        (
          condition.probability == null ||
          condition.probability < 0 ||
          condition.probability > 1
        )
      ) {
        issues.push(
          `Invalid Bernoulli probability for ${condition.stateKey}`
        );
      }

      if (
        condition.conditionType === "categorical" &&
        !condition.categories.length
      ) {
        issues.push(
          `Categorical condition has no categories: ${condition.stateKey}`
        );
      }
    }

    if (
      !scenario.horizonDays ||
      scenario.horizonDays < 1
    ) {
      issues.push(
        "Scenario horizon must be at least one day."
      );
    }

    return {
      valid:
        issues.length === 0,
      issues
    };
  }

  global.INFINICUS.DT.scenarioValidator =
    Object.freeze({ validate });
})(window);
