(function (global) {
  "use strict";

  function validate(entity, entityType) {
    const issues = [];

    if (!entityType) {
      issues.push("Entity type was not found in the ontology.");
      return { valid: false, issues };
    }

    const allowed =
      new Map(
        (entityType.attributes || [])
          .map(attribute => [attribute.code, attribute])
      );

    for (const attribute of entityType.attributes || []) {
      if (
        attribute.required &&
        (
          entity.attributes[attribute.code] == null ||
          entity.attributes[attribute.code] === ""
        )
      ) {
        issues.push(
          `Required attribute is missing: ${attribute.code}`
        );
      }
    }

    for (const key of Object.keys(entity.attributes || {})) {
      if (!allowed.has(key)) {
        issues.push(
          `Attribute is not defined by the ontology: ${key}`
        );
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  global.INFINICUS.DT.entityInstanceValidator =
    Object.freeze({ validate });
})(window);
