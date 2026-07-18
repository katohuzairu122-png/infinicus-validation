(function (global) {
  "use strict";

  function partition(state = []) {
    return {
      actual:
        state.filter(
          item =>
            item.sourceClass === "actual"
        ).map(structuredClone),
      assumed:
        state.filter(
          item =>
            item.sourceClass === "assumed"
        ).map(structuredClone),
      simulated:
        state.filter(
          item =>
            item.sourceClass === "simulated"
        ).map(structuredClone)
    };
  }

  global.INFINICUS.DT.simulationStatePartitioner =
    Object.freeze({ partition });
})(window);
