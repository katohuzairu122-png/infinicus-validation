(function (global) {
  "use strict";

  const CONDITION_TYPES = Object.freeze([
    "fixed",
    "bounded",
    "categorical",
    "uniform",
    "normal",
    "triangular",
    "bernoulli"
  ]);

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (
      !input.scenarioId ||
      !input.stateKey ||
      !CONDITION_TYPES.includes(input.conditionType)
    ) {
      return runtime.failure(
        "INITIAL_CONDITION_INVALID",
        "scenarioId, stateKey, and supported conditionType are required."
      );
    }

    return runtime.success({
      initialConditionId:
        input.initialConditionId ||
        runtime.createId("dt_initial_condition"),
      scenarioId:
        String(input.scenarioId),
      stateKey:
        String(input.stateKey),
      conditionType:
        input.conditionType,
      value:
        runtime.clone(input.value),
      minimum:
        input.minimum == null ? null : Number(input.minimum),
      maximum:
        input.maximum == null ? null : Number(input.maximum),
      mean:
        input.mean == null ? null : Number(input.mean),
      standardDeviation:
        input.standardDeviation == null
          ? null
          : Number(input.standardDeviation),
      mode:
        input.mode == null ? null : Number(input.mode),
      probability:
        input.probability == null
          ? null
          : Number(input.probability),
      categories:
        runtime.clone(input.categories || []),
      sourceClass:
        String(input.sourceClass || "assumed"),
      rationale:
        String(input.rationale || ""),
      lineage:
        runtime.clone(input.lineage || []),
      confidence:
        Number(input.confidence ?? 0.5),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.DT.initialConditionModel =
    Object.freeze({
      CONDITION_TYPES,
      create
    });
})(window);
