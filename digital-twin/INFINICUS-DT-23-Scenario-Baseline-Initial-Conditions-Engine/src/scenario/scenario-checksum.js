(function (global) {
  "use strict";

  function stable(value) {
    if (
      value == null ||
      typeof value !== "object"
    ) {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map(stable).join(",")}]`;
    }

    return `{${Object.keys(value)
      .sort()
      .map(key =>
        `${JSON.stringify(key)}:${stable(value[key])}`
      )
      .join(",")}}`;
  }

  function hash(value) {
    const input = stable(value);
    let result = 2166136261;

    for (
      let index = 0;
      index < input.length;
      index += 1
    ) {
      result ^= input.charCodeAt(index);
      result =
        Math.imul(
          result,
          16777619
        );
    }

    return `scenario_${(result >>> 0)
      .toString(16)
      .padStart(8, "0")}`;
  }

  global.INFINICUS.DT.scenarioChecksum =
    Object.freeze({ stable, hash });
})(window);
