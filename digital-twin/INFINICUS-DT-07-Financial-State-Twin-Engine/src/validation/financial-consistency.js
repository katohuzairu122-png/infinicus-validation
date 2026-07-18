(function (global) {
  "use strict";

  function validate({
    accounts = [],
    states = []
  } = {}) {
    const issues = [];
    const currencies =
      new Set(states.map(state => state.currency));

    if (currencies.size > 1) {
      issues.push(
        "Multiple currencies are present without a conversion policy."
      );
    }

    const profile =
      global.INFINICUS.DT
        .financialProfileBuilder
        .latest(states, accounts);

    const balanceDifference =
      profile.assets -
      (profile.liabilities + profile.equity);

    if (Math.abs(balanceDifference) > 0.01) {
      issues.push(
        `Balance equation mismatch: ${balanceDifference.toFixed(2)}`
      );
    }

    const invalidConfidence =
      states.filter(state =>
        state.confidence < 0 ||
        state.confidence > 1
      );

    if (invalidConfidence.length) {
      issues.push(
        "One or more financial states have invalid confidence values."
      );
    }

    return {
      valid:
        issues.length === 0,
      issues,
      profile,
      balanceDifference:
        Number(balanceDifference.toFixed(4))
    };
  }

  global.INFINICUS.DT.financialConsistencyValidator =
    Object.freeze({ validate });
})(window);
