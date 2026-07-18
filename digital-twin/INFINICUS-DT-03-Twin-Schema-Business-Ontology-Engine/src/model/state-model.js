(function (global) {
  "use strict";

  function create(input = {}) {
    const runtime = global.INFINICUS.DT.runtime;

    if (!input.name || !Array.isArray(input.states)) {
      return runtime.failure(
        "STATE_MODEL_INVALID",
        "name and states are required."
      );
    }

    const stateCodes =
      new Set(input.states.map(state => String(state.code)));

    const transitions =
      (input.transitions || []).filter(transition =>
        stateCodes.has(String(transition.from)) &&
        stateCodes.has(String(transition.to))
      );

    return runtime.success({
      stateModelId:
        input.stateModelId ||
        runtime.createId("dt_state_model"),
      name:
        String(input.name),
      entityTypeId:
        input.entityTypeId || null,
      states:
        runtime.clone(input.states),
      transitions:
        runtime.clone(transitions),
      initialState:
        input.initialState || input.states[0]?.code || null,
      status:
        String(input.status || "active")
    });
  }

  global.INFINICUS.DT.stateModel =
    Object.freeze({ create });
})(window);
