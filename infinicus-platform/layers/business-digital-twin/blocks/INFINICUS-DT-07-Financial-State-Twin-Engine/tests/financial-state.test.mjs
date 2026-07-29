import assert from "node:assert/strict";

const profile = {
  assets: 100,
  liabilities: 40,
  equity: 60
};

assert.equal(
  profile.assets,
  profile.liabilities + profile.equity
);

const revenue = 200;
const cost = 120;
const expense = 30;
const grossProfit = revenue - cost;
const operatingProfit = grossProfit - expense;

assert.equal(grossProfit, 80);
assert.equal(operatingProfit, 50);
assert.equal(
  Number((grossProfit / revenue * 100).toFixed(2)),
  40
);

console.log("DT-07 financial state tests passed.");
