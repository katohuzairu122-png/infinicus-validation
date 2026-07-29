import assert from "node:assert/strict";

const state = [
  {
    stateKey:
      "financial.cash",
    sourceClass:
      "actual"
  },
  {
    stateKey:
      "market.demand",
    sourceClass:
      "assumed"
  },
  {
    stateKey:
      "operations.capacity",
    sourceClass:
      "simulated"
  }
];

const partitions = {
  actual:
    state.filter(
      item =>
        item.sourceClass === "actual"
    ),
  assumed:
    state.filter(
      item =>
        item.sourceClass === "assumed"
    ),
  simulated:
    state.filter(
      item =>
        item.sourceClass === "simulated"
    )
};

assert.equal(
  partitions.actual.length,
  1
);

assert.equal(
  partitions.assumed.length,
  1
);

assert.equal(
  partitions.simulated.length,
  1
);

assert.equal(
  partitions.actual[0].stateKey,
  "financial.cash"
);

console.log("DT-24 simulation package tests passed.");
