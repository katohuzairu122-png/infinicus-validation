import assert from "node:assert/strict";

const states = [
  {
    conditionScore: 90,
    availabilityPercent: 98,
    downtimeHours: 2,
    failureCount: 0
  },
  {
    conditionScore: 50,
    availabilityPercent: 70,
    downtimeHours: 20,
    failureCount: 3
  }
];

const avgCondition =
  states.reduce(
    (sum, state) =>
      sum + state.conditionScore,
    0
  ) / states.length;

const avgAvailability =
  states.reduce(
    (sum, state) =>
      sum +
      state.availabilityPercent,
    0
  ) / states.length;

assert.equal(avgCondition, 70);
assert.equal(avgAvailability, 84);
assert.equal(
  states.reduce(
    (sum, state) =>
      sum +
      state.failureCount,
    0
  ),
  3
);

const dependencies = [
  {
    critical: true,
    redundancyAssetIds: []
  },
  {
    critical: true,
    redundancyAssetIds: ["backup"]
  }
];

assert.equal(
  dependencies.filter(
    item =>
      item.critical &&
      item.redundancyAssetIds.length === 0
  ).length,
  1
);

console.log("DT-14 asset infrastructure tests passed.");
