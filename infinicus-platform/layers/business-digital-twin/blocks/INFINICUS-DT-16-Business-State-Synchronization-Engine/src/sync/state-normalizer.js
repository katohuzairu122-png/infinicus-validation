(function (global) {
  "use strict";

  function flattenDomain(
    domain,
    value,
    prefix = ""
  ) {
    const results = [];

    if (
      value == null ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      results.push({
        stateKey:
          [domain, prefix]
            .filter(Boolean)
            .join("."),
        value:
          structuredClone(value),
        sourceType:
          "observed",
        confidence:
          1,
        observedAt:
          new Date().toISOString(),
        lineage: []
      });

      return results;
    }

    for (
      const [key, child]
      of Object.entries(value)
    ) {
      const nextPrefix =
        prefix
          ? `${prefix}.${key}`
          : key;

      if (
        child &&
        typeof child === "object" &&
        !Array.isArray(child) &&
        !(
          "value" in child &&
          (
            "sourceType" in child ||
            "confidence" in child ||
            "lineage" in child
          )
        )
      ) {
        results.push(
          ...flattenDomain(
            domain,
            child,
            nextPrefix
          )
        );
      } else {
        const wrapped =
          child &&
          typeof child === "object" &&
          !Array.isArray(child) &&
          "value" in child;

        results.push({
          stateKey:
            `${domain}.${nextPrefix}`,
          value:
            structuredClone(
              wrapped
                ? child.value
                : child
            ),
          sourceType:
            wrapped
              ? String(
                  child.sourceType ||
                  "observed"
                )
              : "observed",
          confidence:
            wrapped
              ? Number(
                  child.confidence ?? 1
                )
              : 1,
          observedAt:
            wrapped
              ? (
                  child.observedAt ||
                  new Date().toISOString()
                )
              : new Date().toISOString(),
          lineage:
            wrapped
              ? structuredClone(
                  child.lineage || []
                )
              : []
        });
      }
    }

    return results;
  }

  global.INFINICUS.DT
    .stateNormalizer =
      Object.freeze({
        flattenDomain
      });
})(window);
