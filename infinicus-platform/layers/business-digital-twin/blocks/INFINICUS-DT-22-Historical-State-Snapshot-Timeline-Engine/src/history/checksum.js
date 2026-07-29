(function (global) {
  "use strict";

  function stableStringify(value) {
    if (value == null || typeof value !== "object") {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(",")}]`;
    }

    return `{${Object.keys(value)
      .sort()
      .map(key =>
        `${JSON.stringify(key)}:${stableStringify(value[key])}`
      )
      .join(",")}}`;
  }

  function hash(value) {
    const input = stableStringify(value);
    let hashValue = 2166136261;

    for (let index = 0; index < input.length; index += 1) {
      hashValue ^= input.charCodeAt(index);
      hashValue = Math.imul(hashValue, 16777619);
    }

    return `fnv1a_${(hashValue >>> 0).toString(16).padStart(8, "0")}`;
  }

  global.INFINICUS.DT.snapshotChecksum =
    Object.freeze({ stableStringify, hash });
})(window);
