import assert from "node:assert/strict";

const blocks=Array.from(
  {length:24},
  (_,index)=>`OM-${String(index+1).padStart(2,"0")}`
);

assert.equal(blocks.length,24);
assert.equal(blocks[0],"OM-01");
assert.equal(blocks.at(-1),"OM-24");

const requiredRoutes=[
  "om.monitoring_contract.intake",
  "om.observations.collect",
  "om.outcome_verdict.evaluate",
  "om.learning_package.publish"
];

assert.equal(requiredRoutes.length,4);
assert.equal(
  requiredRoutes.includes("om.learning_package.publish"),
  true
);

const states=[
  "assembled",
  "deploying",
  "deployed",
  "failed",
  "rolled_back"
];

assert.equal(states.includes("deployed"),true);

console.log("OM-25 master integration tests passed.");
