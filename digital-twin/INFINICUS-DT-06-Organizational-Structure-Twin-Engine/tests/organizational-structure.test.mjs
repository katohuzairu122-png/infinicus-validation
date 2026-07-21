import assert from "node:assert/strict";

const positions = [
  {
    positionId: "ceo",
    reportsToPositionId: null
  },
  {
    positionId: "manager",
    reportsToPositionId: "ceo"
  },
  {
    positionId: "staff",
    reportsToPositionId: "manager"
  }
];

const byId =
  new Map(
    positions.map(item => [
      item.positionId,
      item
    ])
  );

assert.equal(
  byId.get("manager").reportsToPositionId,
  "ceo"
);

const directReports =
  positions.filter(item =>
    item.reportsToPositionId === "ceo"
  );

assert.equal(
  directReports.length,
  1
);

const vacant = [
  { positionId: "a", occupant: null },
  { positionId: "b", occupant: "person-1" }
].filter(item => !item.occupant);

assert.equal(vacant.length, 1);

console.log("DT-06 organizational structure tests passed.");
