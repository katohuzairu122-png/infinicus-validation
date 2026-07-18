(function (global) {
  "use strict";

  function analyze(entities = [], relationships = []) {
    const entityIds =
      new Set(
        entities.map(item => item.entityInstanceId)
      );

    const unresolvedRelationships =
      relationships.filter(item =>
        !entityIds.has(item.sourceEntityInstanceId) ||
        !entityIds.has(item.targetEntityInstanceId)
      );

    const connected = new Set();

    for (const relationship of relationships) {
      connected.add(relationship.sourceEntityInstanceId);
      connected.add(relationship.targetEntityInstanceId);
    }

    const orphanEntities =
      entities.filter(item =>
        !connected.has(item.entityInstanceId)
      );

    return {
      valid:
        unresolvedRelationships.length === 0,
      unresolvedRelationships:
        unresolvedRelationships.map(structuredClone),
      orphanEntities:
        orphanEntities.map(structuredClone)
    };
  }

  global.INFINICUS.DT.graphIntegrityAnalyzer =
    Object.freeze({ analyze });
})(window);
