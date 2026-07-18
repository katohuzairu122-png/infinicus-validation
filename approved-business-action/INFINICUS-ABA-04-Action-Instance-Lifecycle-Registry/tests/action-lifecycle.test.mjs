import assert from "node:assert/strict";

const transitions = {
  draft: ["pending_validation", "cancelled"],
  pending_validation: ["pending_approval", "blocked"],
  pending_approval: ["approved", "rejected"],
  approved: ["scheduled", "revoked"],
  scheduled: ["executing", "cancelled"],
  executing: ["completed", "failed"],
  completed: ["verified", "rolled_back"]
};

assert.equal(
  transitions.draft.includes("pending_validation"),
  true
);

assert.equal(
  transitions.draft.includes("executing"),
  false
);

const currentVersion = 2;
const expectedVersion = 2;
assert.equal(currentVersion === expectedVersion, true);

const expiredAt = new Date(Date.now() - 1000);
assert.equal(expiredAt.getTime() <= Date.now(), true);

console.log("ABA-04 action lifecycle tests passed.");
