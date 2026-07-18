import assert from "node:assert/strict";

function hasCycle(graph, start) {
  const visited = new Set();
  const stack = new Set();

  function visit(node) {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;

    visited.add(node);
    stack.add(node);

    for (const dependency of graph.get(node) || []) {
      if (visit(dependency)) return true;
    }

    stack.delete(node);
    return false;
  }

  return visit(start);
}

const validGraph = new Map([
  ["revenue", []],
  ["cost", []],
  ["profit", ["revenue", "cost"]]
]);

assert.equal(
  hasCycle(validGraph, "profit"),
  false
);

const cyclicGraph = new Map([
  ["a", ["b"]],
  ["b", ["a"]]
]);

assert.equal(
  hasCycle(cyclicGraph, "a"),
  true
);

const code = "Gross Margin %"
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9_]/g, "_");

assert.equal(code, "gross_margin__");

console.log("BI-09 metric registry tests passed.");
