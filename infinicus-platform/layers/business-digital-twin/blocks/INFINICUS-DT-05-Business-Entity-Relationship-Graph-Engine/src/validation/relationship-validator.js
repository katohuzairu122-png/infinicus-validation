(function (global) {
  "use strict";

  function validate({
    relationship,
    relationshipType,
    sourceEntity,
    targetEntity,
    existingRelationships = []
  }) {
    const issues = [];

    if (!relationshipType) {
      issues.push("Relationship type was not found in the ontology.");
      return { valid: false, issues };
    }

    if (!sourceEntity) {
      issues.push("Source entity instance was not found.");
    }

    if (!targetEntity) {
      issues.push("Target entity instance was not found.");
    }

    if (
      sourceEntity &&
      sourceEntity.entityTypeId !==
      relationshipType.sourceEntityTypeId
    ) {
      issues.push("Source entity type does not match relationship definition.");
    }

    if (
      targetEntity &&
      targetEntity.entityTypeId !==
      relationshipType.targetEntityTypeId
    ) {
      issues.push("Target entity type does not match relationship definition.");
    }

    const sameType =
      existingRelationships.filter(item =>
        item.relationshipTypeId ===
        relationship.relationshipTypeId
      );

    if (
      relationshipType.cardinality === "one_to_one" &&
      sameType.some(item =>
        item.sourceEntityInstanceId ===
          relationship.sourceEntityInstanceId ||
        item.targetEntityInstanceId ===
          relationship.targetEntityInstanceId
      )
    ) {
      issues.push("One-to-one cardinality would be violated.");
    }

    if (
      relationshipType.cardinality === "one_to_many" &&
      sameType.some(item =>
        item.targetEntityInstanceId ===
        relationship.targetEntityInstanceId
      )
    ) {
      issues.push("One-to-many target cardinality would be violated.");
    }

    if (
      relationshipType.cardinality === "many_to_one" &&
      sameType.some(item =>
        item.sourceEntityInstanceId ===
        relationship.sourceEntityInstanceId
      )
    ) {
      issues.push("Many-to-one source cardinality would be violated.");
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  global.INFINICUS.DT.relationshipInstanceValidator =
    Object.freeze({ validate });
})(window);
