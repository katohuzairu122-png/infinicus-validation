(function (global) {
  "use strict";

  function validate(ontology) {
    const issues = [];
    const entityIds =
      new Set(ontology.entityTypes.map(item => item.entityTypeId));

    const entityCodes =
      new Set();

    for (const entity of ontology.entityTypes) {
      if (entityCodes.has(entity.code)) {
        issues.push(`Duplicate entity type code: ${entity.code}`);
      }

      entityCodes.add(entity.code);

      const attributeCodes = new Set();

      for (const attribute of entity.attributes || []) {
        if (attributeCodes.has(attribute.code)) {
          issues.push(
            `Duplicate attribute code ${attribute.code} in ${entity.code}`
          );
        }

        attributeCodes.add(attribute.code);
      }

      if (
        entity.parentEntityTypeId &&
        !entityIds.has(entity.parentEntityTypeId)
      ) {
        issues.push(
          `Unknown parent entity type: ${entity.parentEntityTypeId}`
        );
      }
    }

    for (const relationship of ontology.relationshipTypes) {
      if (!entityIds.has(relationship.sourceEntityTypeId)) {
        issues.push(
          `Unknown relationship source: ${relationship.sourceEntityTypeId}`
        );
      }

      if (!entityIds.has(relationship.targetEntityTypeId)) {
        issues.push(
          `Unknown relationship target: ${relationship.targetEntityTypeId}`
        );
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  global.INFINICUS.DT.ontologyValidator =
    Object.freeze({ validate });
})(window);
