import assert from "node:assert/strict";

const stages = new Map([
  ["qualified", 0.5],
  ["proposal", 0.75]
]);

const opportunities = [
  { stage: "qualified", value: 100 },
  { stage: "proposal", value: 200 }
];

const weighted =
  opportunities.reduce(
    (sum, item) =>
      sum + item.value * stages.get(item.stage),
    0
  );

assert.equal(weighted, 200);

const won = 6;
const lost = 4;

assert.equal(
  Number((won / (won + lost) * 100).toFixed(2)),
  60
);

console.log("DT-09 sales revenue flow tests passed.");
