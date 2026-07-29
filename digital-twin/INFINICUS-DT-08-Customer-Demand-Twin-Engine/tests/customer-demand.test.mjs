import assert from "node:assert/strict";

const states = [
  {
    demandUnits: 10,
    revenueValue: 100,
    retentionRatePercent: 80
  },
  {
    demandUnits: 30,
    revenueValue: 300,
    retentionRatePercent: 90
  }
];

const totalDemand =
  states.reduce(
    (sum, state) => sum + state.demandUnits,
    0
  );

const totalRevenue =
  states.reduce(
    (sum, state) => sum + state.revenueValue,
    0
  );

const weightedRetention =
  states.reduce(
    (sum, state) =>
      sum +
      state.retentionRatePercent *
      state.demandUnits,
    0
  ) / totalDemand;

assert.equal(totalDemand, 40);
assert.equal(totalRevenue, 400);
assert.equal(weightedRetention, 87.5);

console.log("DT-08 customer demand tests passed.");
