(function (global) {
  "use strict";

  function build(snapshot) {
    return snapshot.state.map(state => ({
      stateKey:
        state.stateKey,
      value:
        structuredClone(state.value),
      sourceClass:
        "actual",
      sourceType:
        state.sourceType,
      confidence:
        state.confidence,
      observedAt:
        state.observedAt,
      lineage:
        structuredClone(state.lineage || []),
      businessStateRecordId:
        state.businessStateRecordId,
      version:
        state.version
    }));
  }

  function applyConditions(
    baselineState,
    conditions
  ) {
    const byKey =
      new Map(
        baselineState.map(item => [
          item.stateKey,
          structuredClone(item)
        ])
      );

    for (const condition of conditions) {
      const current =
        byKey.get(condition.stateKey);

      byKey.set(
        condition.stateKey,
        {
          ...current,
          scenarioCondition:
            structuredClone(condition),
          sourceClass:
            condition.sourceClass,
          value:
            condition.conditionType === "fixed"
              ? structuredClone(condition.value)
              : structuredClone(current?.value)
        }
      );
    }

    return [...byKey.values()];
  }

  global.INFINICUS.DT.scenarioBaselineBuilder =
    Object.freeze({
      build,
      applyConditions
    });
})(window);
