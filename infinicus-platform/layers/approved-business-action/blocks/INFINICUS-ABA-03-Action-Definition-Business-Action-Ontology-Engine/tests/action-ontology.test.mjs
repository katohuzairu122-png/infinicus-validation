import assert from "node:assert/strict";

function valueTypeMatches(value, type) {
  if (type === "integer") return Number.isInteger(value);
  if (type === "number" || type === "currency") {
    return typeof value === "number" && Number.isFinite(value);
  }
  if (type === "boolean") return typeof value === "boolean";
  return typeof value === "string";
}

assert.equal(valueTypeMatches(500, "currency"), true);
assert.equal(valueTypeMatches("500", "currency"), false);
assert.equal(valueTypeMatches(true, "boolean"), true);
assert.equal(valueTypeMatches(3, "integer"), true);

const actionType = {
  targetTypeId: "target_customer_segment"
};

const target = {
  targetId: "segment_active_customers",
  targetTypeId: "target_customer_segment"
};

assert.equal(actionType.targetTypeId === target.targetTypeId, true);

console.log("ABA-03 action ontology tests passed.");
