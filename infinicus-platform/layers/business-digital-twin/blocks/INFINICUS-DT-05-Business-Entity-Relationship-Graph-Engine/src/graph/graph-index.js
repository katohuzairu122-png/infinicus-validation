(function (global) {
  "use strict";

  function build(entities = [], relationships = []) {
    const adjacency = new Map();

    for (const entity of entities) {
      adjacency.set(entity.entityInstanceId, []);
    }

    for (const relationship of relationships) {
      if (!adjacency.has(relationship.sourceEntityInstanceId)) {
        adjacency.set(relationship.sourceEntityInstanceId, []);
      }

      adjacency.get(relationship.sourceEntityInstanceId).push({
        relationshipInstanceId:
          relationship.relationshipInstanceId,
        relationshipTypeId:
          relationship.relationshipTypeId,
        direction: "outbound",
        entityInstanceId:
          relationship.targetEntityInstanceId
      });

      if (!adjacency.has(relationship.targetEntityInstanceId)) {
        adjacency.set(relationship.targetEntityInstanceId, []);
      }

      adjacency.get(relationship.targetEntityInstanceId).push({
        relationshipInstanceId:
          relationship.relationshipInstanceId,
        relationshipTypeId:
          relationship.relationshipTypeId,
        direction: "inbound",
        entityInstanceId:
          relationship.sourceEntityInstanceId
      });
    }

    return adjacency;
  }

  function traverse(startEntityId, adjacency, depth = 1) {
    const visited = new Set([startEntityId]);
    const queue = [{ id: startEntityId, depth: 0 }];
    const results = [];

    while (queue.length) {
      const current = queue.shift();

      if (current.depth >= depth) continue;

      for (const edge of adjacency.get(current.id) || []) {
        results.push({
          fromEntityInstanceId:
            current.id,
          ...edge,
          depth:
            current.depth + 1
        });

        if (!visited.has(edge.entityInstanceId)) {
          visited.add(edge.entityInstanceId);
          queue.push({
            id: edge.entityInstanceId,
            depth: current.depth + 1
          });
        }
      }
    }

    return results;
  }

  global.INFINICUS.DT.graphIndex =
    Object.freeze({ build, traverse });
})(window);
