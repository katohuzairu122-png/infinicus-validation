import assert from "node:assert/strict";

function buildAdjacency(relationships) {
  const adjacency = new Map();

  for (const relationship of relationships) {
    if (!adjacency.has(relationship.source)) {
      adjacency.set(relationship.source, []);
    }

    adjacency.get(relationship.source).push(
      relationship.target
    );
  }

  return adjacency;
}

const adjacency = buildAdjacency([
  { source: "business", target: "department" },
  { source: "department", target: "role" }
]);

assert.deepEqual(
  adjacency.get("business"),
  ["department"]
);

assert.deepEqual(
  adjacency.get("department"),
  ["role"]
);

const required = ["name", "code"];
const attributes = { name: "Finance", code: "FIN" };

assert.deepEqual(
  required.filter(key => attributes[key] == null),
  []
);

console.log("DT-05 entity relationship graph tests passed.");
