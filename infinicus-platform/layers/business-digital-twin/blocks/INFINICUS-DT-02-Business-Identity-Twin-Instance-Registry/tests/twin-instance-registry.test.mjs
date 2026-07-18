import assert from "node:assert/strict";

function normalizeKey(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

assert.equal(
  normalizeKey(" INFINICUS Main Business "),
  "infinicus_main_business"
);

function validate(parent, child) {
  if (!parent) {
    return child.twinType === "business";
  }

  return (
    parent.businessId === child.businessId &&
    parent.lifecycleState !== "retired" &&
    parent.twinId !== child.twinId
  );
}

assert.equal(
  validate(null, {
    twinType: "business"
  }),
  true
);

assert.equal(
  validate(
    {
      twinId: "parent-1",
      businessId: "business-1",
      lifecycleState: "active"
    },
    {
      twinId: "child-1",
      businessId: "business-1",
      twinType: "branch"
    }
  ),
  true
);

assert.equal(
  validate(
    {
      twinId: "parent-1",
      businessId: "business-1",
      lifecycleState: "retired"
    },
    {
      twinId: "child-1",
      businessId: "business-1",
      twinType: "branch"
    }
  ),
  false
);

console.log("DT-02 twin instance registry tests passed.");
