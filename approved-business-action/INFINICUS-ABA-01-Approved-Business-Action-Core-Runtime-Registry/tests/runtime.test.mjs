import assert from "node:assert/strict";

const transitions = {
  draft: ["pending_validation"],
  pending_validation: ["pending_approval"],
  pending_approval: ["approved"]
};

assert.equal(transitions.draft.includes("pending_validation"), true);
assert.equal(transitions.draft.includes("approved"), false);

const success = data => ({ ok: true, data, error: null });
const failure = (code, message) => ({
  ok: false,
  data: null,
  error: { code, message }
});

assert.equal(success({ id: 1 }).ok, true);
assert.equal(failure("X", "Y").ok, false);

console.log("ABA-01 runtime tests passed.");
