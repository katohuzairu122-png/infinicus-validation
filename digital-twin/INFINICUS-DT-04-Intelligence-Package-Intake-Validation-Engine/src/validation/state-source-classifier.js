(function (global) {
  "use strict";

  const SOURCES = Object.freeze([
    "observed",
    "calculated",
    "inferred",
    "assumed",
    "simulated"
  ]);

  function classify(item = {}) {
    const source =
      SOURCES.includes(item.sourceType)
        ? item.sourceType
        : item.simulated === true
          ? "simulated"
          : item.confidence != null
            ? "inferred"
            : item.formula != null
              ? "calculated"
              : "observed";

    return {
      ...structuredClone(item),
      sourceType: source
    };
  }

  function validate(items = [], allowedSources = []) {
    const classified =
      items.map(classify);

    const disallowed =
      classified.filter(item =>
        !allowedSources.includes(item.sourceType)
      );

    return {
      valid:
        disallowed.length === 0,
      classified,
      disallowed
    };
  }

  global.INFINICUS.DT.stateSourceClassifier =
    Object.freeze({
      SOURCES,
      classify,
      validate
    });
})(window);
