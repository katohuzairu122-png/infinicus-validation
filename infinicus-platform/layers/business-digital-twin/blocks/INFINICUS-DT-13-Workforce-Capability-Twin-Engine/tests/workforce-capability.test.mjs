import assert from "node:assert/strict";

const states = [
  {
    availableHours: 40,
    assignedHours: 36,
    productiveHours: 30,
    absenceHours: 4
  },
  {
    availableHours: 40,
    assignedHours: 44,
    productiveHours: 35,
    absenceHours: 0
  }
];

const available =
  states.reduce(
    (sum, state) =>
      sum + state.availableHours,
    0
  );

const assigned =
  states.reduce(
    (sum, state) =>
      sum + state.assignedHours,
    0
  );

const productive =
  states.reduce(
    (sum, state) =>
      sum + state.productiveHours,
    0
  );

assert.equal(available, 80);
assert.equal(assigned, 80);
assert.equal(productive, 65);
assert.equal(
  assigned / available * 100,
  100
);

const overloaded =
  states.filter(
    state =>
      state.assignedHours >
      state.availableHours
  );

assert.equal(overloaded.length, 1);

console.log("DT-13 workforce capability tests passed.");
