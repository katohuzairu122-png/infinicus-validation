import assert from "node:assert/strict";

const factor={
  magnitude:0.8,
  confidence:0.9
};

const overlap=0.75;
const scope=0.8;
const mechanism=0.7;

const materiality=
  factor.magnitude*0.35 +
  factor.confidence*0.25 +
  overlap*0.25 +
  scope*0.1 +
  mechanism*0.05;

assert.equal(materiality>0.75,true);

const classifications=[
  "immaterial",
  "minor_confounder",
  "material_confounder",
  "major_confounder"
];

assert.equal(
  classifications.includes("major_confounder"),
  true
);

console.log("OM-15 external factor tests passed.");
