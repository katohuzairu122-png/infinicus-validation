(function (global) {
  "use strict";

  function validate(parent, child) {
    if (!parent) {
      return {
        valid: child.twinType === "business",
        issues:
          child.twinType === "business"
            ? []
            : ["Parent twin is required."]
      };
    }

    const issues = [];

    if (parent.businessId !== child.businessId) {
      issues.push(
        "Parent and child twins must belong to the same business identity."
      );
    }

    if (parent.lifecycleState === "retired") {
      issues.push(
        "A retired twin cannot receive new child twins."
      );
    }

    if (parent.twinId === child.twinId) {
      issues.push(
        "A twin cannot be its own parent."
      );
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  global.INFINICUS.DT.twinHierarchyValidator =
    Object.freeze({ validate });
})(window);
