import assert from "node:assert/strict";

function resolve(path, context) {
  return path
    .split(".")
    .reduce((value, key) => value?.[key], context);
}

const context = {
  health: {
    score: 82
  },
  signal: {
    code: "LOW_MARGIN"
  }
};

assert.equal(
  resolve("health.score", context),
  82
);

assert.equal(
  resolve("signal.code", context),
  "LOW_MARGIN"
);

const rows = [
  { region: "A", revenue: 100, cost: 60 },
  { region: "B", revenue: 80, cost: 50 }
];

const projected = rows.map(row => ({
  region: row.region,
  revenue: row.revenue
}));

assert.deepEqual(
  projected,
  [
    { region: "A", revenue: 100 },
    { region: "B", revenue: 80 }
  ]
);

console.log("BI-22 reporting exploration tests passed.");
