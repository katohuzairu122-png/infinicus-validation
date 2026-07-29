import assert from "node:assert/strict";

const markets = [
  {
    tam: 1000,
    sam: 500,
    som: 100,
    growth: 10
  },
  {
    tam: 2000,
    sam: 800,
    som: 150,
    growth: 20
  }
];

assert.equal(
  markets.reduce(
    (sum, item) =>
      sum + item.tam,
    0
  ),
  3000
);

assert.equal(
  markets.reduce(
    (sum, item) =>
      sum + item.sam,
    0
  ),
  1300
);

assert.equal(
  markets.reduce(
    (sum, item) =>
      sum + item.som,
    0
  ),
  250
);

assert.equal(
  markets.reduce(
    (sum, item) =>
      sum + item.growth,
    0
  ) / markets.length,
  15
);

const competitors = [
  { name: "A", threat: 60 },
  { name: "B", threat: 80 }
].sort(
  (a, b) =>
    b.threat - a.threat
);

assert.equal(
  competitors[0].name,
  "B"
);

console.log("DT-15 market competitive tests passed.");
