import assert from "node:assert/strict";

function evidenceScore(evidence, counter) {
  const positive = evidence.reduce(
    (sum, item) => sum + item.reliability * item.relevance,
    0
  );

  const negative = counter.reduce(
    (sum, item) => sum + item.reliability * item.relevance,
    0
  );

  return positive + negative === 0
    ? 0
    : positive / (positive + negative);
}

assert.equal(
  Number(evidenceScore(
    [
      { reliability: 1, relevance: 0.8 },
      { reliability: 0.8, relevance: 0.5 }
    ],
    [
      { reliability: 0.5, relevance: 0.4 }
    ]
  ).toFixed(4)),
  0.8571
);

const drivers = [
  { name: "A", confidence: 0.8 },
  { name: "B", confidence: 0.6 },
  { name: "C", confidence: 0.3 }
].sort((a, b) => b.confidence - a.confidence);

assert.equal(drivers[0].name, "A");
assert.equal(drivers[2].name, "C");

console.log("BI-21 root-cause driver tests passed.");
