(function (global) {
  "use strict";

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function levenshtein(a, b) {
    const left = String(a ?? "");
    const right = String(b ?? "");

    const matrix =
      Array.from(
        { length: left.length + 1 },
        () =>
          Array(right.length + 1).fill(0)
      );

    for (let i = 0; i <= left.length; i += 1) {
      matrix[i][0] = i;
    }

    for (let j = 0; j <= right.length; j += 1) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= left.length; i += 1) {
      for (let j = 1; j <= right.length; j += 1) {
        const cost =
          left[i - 1] === right[j - 1]
            ? 0
            : 1;

        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[left.length][right.length];
  }

  function stringSimilarity(a, b) {
    const left = normalize(a);
    const right = normalize(b);

    if (!left && !right) return 1;
    if (!left || !right) return 0;

    const distance =
      levenshtein(left, right);

    return 1 -
      distance /
      Math.max(left.length, right.length);
  }

  function fieldScore(a, b, rule) {
    switch (rule.method) {
      case "exact":
        return Object.is(a, b) ? 1 : 0;

      case "normalized_exact":
        return normalize(a) === normalize(b)
          ? 1
          : 0;

      case "string_similarity":
        return stringSimilarity(a, b);

      case "numeric_tolerance": {
        const left = Number(a);
        const right = Number(b);

        if (
          !Number.isFinite(left) ||
          !Number.isFinite(right)
        ) {
          return 0;
        }

        return Math.abs(left - right) <=
          Number(rule.tolerance || 0)
            ? 1
            : 0;
      }

      default:
        return 0;
    }
  }

  global.INFINICUS.BI.entitySimilarity =
    Object.freeze({
      normalize,
      levenshtein,
      stringSimilarity,
      fieldScore
    });
})(window);
