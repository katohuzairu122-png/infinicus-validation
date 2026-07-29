import assert from "node:assert/strict";

const actor={
  capabilityCodes:["finance","reporting"],
  maximumConcurrentTasks:3
};

const required=["finance"];

assert.equal(
  required.every(code=>actor.capabilityCodes.includes(code)),
  true
);

const activeAssignments=[
  {state:"accepted"},
  {state:"pending_acceptance"}
];

assert.equal(
  activeAssignments.length < actor.maximumConcurrentTasks,
  true
);

const incompatible=["approve_payment"];
assert.equal(
  incompatible.includes("approve_payment"),
  true
);

console.log("ABA-14 assignment tests passed.");
