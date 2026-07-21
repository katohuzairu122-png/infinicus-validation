import assert from "node:assert/strict";

function stateMap(snapshot) {
  return new Map(
    snapshot.state.map(item => [
      item.stateKey,
      item.value
    ])
  );
}

const previous = {
  state: [
    { stateKey: "financial.cash", value: 100 },
    { stateKey: "operations.capacity", value: 20 }
  ]
};

const current = {
  state: [
    { stateKey: "financial.cash", value: 120 },
    { stateKey: "operations.capacity", value: 20 },
    { stateKey: "market.demand", value: 90 }
  ]
};

const before = stateMap(previous);
const after = stateMap(current);

assert.equal(before.get("financial.cash"), 100);
assert.equal(after.get("financial.cash"), 120);
assert.equal(after.has("market.demand"), true);

const changed = [...after.keys()].filter(key =>
  before.has(key) &&
  before.get(key) !== after.get(key)
);

assert.deepEqual(changed, ["financial.cash"]);

console.log("DT-22 historical snapshot tests passed.");
